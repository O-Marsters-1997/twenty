package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/net/publicsuffix"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata"
)

const (
	dmarcRecordPrefix     = "_dmarc"
	dmarcVersionTag       = "v=DMARC1"
	dmarcMonitoringPolicy = "p=none"
	dmarcReportMailbox    = "dmarc"
)

type VerificationRecord struct {
	Type     string  `json:"type"`
	Key      string  `json:"key"`
	Value    string  `json:"value"`
	Priority *int    `json:"priority"`
	Status   *string `json:"status"`
}

type EmailingDomain struct {
	ID                        string
	CreatedAt                 metadata.Timestamp
	UpdatedAt                 metadata.Timestamp
	Domain                    string
	Status                    string
	TenantStatus              string
	UnsubscribeHostnameStatus *string
	VerificationRecords       []VerificationRecord
	VerifiedAt                *metadata.Timestamp
}

type TXTLookup func(ctx context.Context, name string) ([]string, error)

type EmailingDomains struct {
	pool   *pgxpool.Pool
	lookup TXTLookup
}

func NewEmailingDomains(pool *pgxpool.Pool, lookup TXTLookup) *EmailingDomains {
	return &EmailingDomains{pool: pool, lookup: lookup}
}

func DNSTXTLookup(ctx context.Context, name string) ([]string, error) {
	return net.DefaultResolver.LookupTXT(ctx, name)
}

func (e *EmailingDomains) AuthorizeWorkspaceSettings(ctx context.Context, principal auth.Principal) error {
	var granted bool
	if err := e.pool.QueryRow(ctx, `SELECT EXISTS (
		SELECT 1 FROM core."roleTarget" rt JOIN core.role r ON r.id = rt."roleId"
		WHERE rt."workspaceId" = $1::uuid
			AND (rt."userWorkspaceId" = NULLIF($2, '')::uuid OR rt."apiKeyId" = NULLIF($3, '')::uuid)
			AND (r."canUpdateAllSettings" OR EXISTS (
				SELECT 1 FROM core."rolePermissionFlag" rpf JOIN core."permissionFlag" pf ON pf.id = rpf."permissionFlagId"
				WHERE rpf."roleId" = r.id AND pf.key = 'WORKSPACE')))`,
		principal.WorkspaceID, principal.UserWorkspaceID, principal.APIKeyID).Scan(&granted); err != nil {
		return fmt.Errorf("look up workspace settings permission: %w", err)
	}
	if !granted {
		return ErrForbidden
	}
	return nil
}

func (e *EmailingDomains) List(ctx context.Context, workspaceID string) ([]*EmailingDomain, error) {
	rows, err := e.pool.Query(ctx, `SELECT id::text, "createdAt", "updatedAt", domain, status, "tenantStatus", "unsubscribeHostnameStatus",
			coalesce("verificationRecords", 'null'::jsonb), "verifiedAt"
		FROM core."emailingDomain" WHERE "workspaceId" = $1::uuid ORDER BY "createdAt" DESC, id`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("query emailing domains: %w", err)
	}
	defer rows.Close()
	domains := []*EmailingDomain{}
	for rows.Next() {
		var domain EmailingDomain
		var records []byte
		var verifiedAt *time.Time
		if err := rows.Scan(&domain.ID, &domain.CreatedAt.Time, &domain.UpdatedAt.Time, &domain.Domain, &domain.Status, &domain.TenantStatus,
			&domain.UnsubscribeHostnameStatus, &records, &verifiedAt); err != nil {
			return nil, fmt.Errorf("scan emailing domain: %w", err)
		}
		if verifiedAt != nil {
			domain.VerifiedAt = &metadata.Timestamp{Time: *verifiedAt}
		}
		if err := json.Unmarshal(records, &domain.VerificationRecords); err != nil {
			return nil, fmt.Errorf("decode verification records of %s: %w", domain.Domain, err)
		}
		domains = append(domains, &domain)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read emailing domains: %w", err)
	}
	for _, domain := range domains {
		if e.canOfferDMARC(ctx, domain.Domain) {
			domain.VerificationRecords = append(domain.VerificationRecords, dmarcRecord(domain.Domain))
		}
	}
	return domains, nil
}

func dmarcRecord(domain string) VerificationRecord {
	return VerificationRecord{
		Type:  "TXT",
		Key:   dmarcRecordPrefix + "." + domain,
		Value: dmarcVersionTag + "; " + dmarcMonitoringPolicy + "; rua=mailto:" + dmarcReportMailbox + "@" + domain,
	}
}

func (e *EmailingDomains) canOfferDMARC(ctx context.Context, domain string) bool {
	if domain == "" {
		return false
	}
	lookupDomains := []string{domain}
	if organizational, err := publicsuffix.EffectiveTLDPlusOne(domain); err == nil && organizational != domain {
		lookupDomains = append(lookupDomains, organizational)
	}
	for _, lookupDomain := range lookupDomains {
		records, err := e.lookup(ctx, dmarcRecordPrefix+"."+lookupDomain)
		var dnsErr *net.DNSError
		switch {
		case errors.As(err, &dnsErr) && dnsErr.IsNotFound:
		case err != nil:
			return false
		case hasDMARCPolicy(records):
			return false
		}
	}
	return true
}

func hasDMARCPolicy(records []string) bool {
	for _, record := range records {
		if strings.HasPrefix(strings.ToLower(strings.TrimSpace(record)), strings.ToLower(dmarcVersionTag)) {
			return true
		}
	}
	return false
}
