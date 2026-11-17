package auth

import (
	"context"
	_ "embed"
	"fmt"
	"math/rand/v2"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
)

const (
	subdomainMaxLength        = 30
	maxNumberedSuffixAttempts = 50
	maxRandomFallbackAttempts = 10
	subdomainSuggestionsCount = 3
)

var (
	subdomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$`)
	nonAlphanumeric  = regexp.MustCompile(`[^a-z0-9]+`)

	//go:embed emailproviders.txt
	emailProvidersText string
	emailProviders     = sync.OnceValue(func() map[string]bool {
		set := map[string]bool{}
		for _, domain := range strings.Split(emailProvidersText, "\n") {
			set[domain] = true
		}
		return set
	})
)

type SubdomainAvailability struct {
	IsValid             bool
	Available           bool
	SuggestedSubdomain  string
	SuggestedSubdomains []string
}

type WorkspaceCreationDefaults struct {
	DisplayName string
	Subdomain   string
}

func isSubdomainValid(subdomain string) bool {
	return subdomainPattern.MatchString(subdomain) &&
		!strings.HasPrefix(subdomain, "api-") &&
		!slices.Contains(reservedSubdomains, strings.ToLower(subdomain))
}

func subdomainFromEmail(email string) string {
	at := strings.LastIndex(email, "@")
	if at == -1 {
		return ""
	}
	domain := email[at+1:]
	if domain == "" || emailProviders()[domain] {
		return ""
	}
	label, _, _ := strings.Cut(domain, ".")
	return strings.ToLower(label)
}

func subdomainSlug(displayName string) string {
	slug := strings.Trim(nonAlphanumeric.ReplaceAllString(strings.ToLower(displayName), "-"), "-")
	if len(slug) > subdomainMaxLength {
		slug = slug[:subdomainMaxLength]
	}
	return strings.TrimRight(slug, "-")
}

func randomSubdomain() string {
	pick := func(words []string) string { return words[rand.IntN(len(words))] }
	return pick(randomPrefixes) + "-" + pick(randomColors) + "-" + pick(randomSuffixes)
}

func numberedSubdomain(base string, suffix int) string {
	suffixPart := "-" + strconv.Itoa(suffix)
	if maxBase := subdomainMaxLength - len(suffixPart); len(base) > maxBase {
		base = strings.TrimRight(base[:maxBase], "-")
	}
	return base + suffixPart
}

func (p *PublicData) subdomainTaken(ctx context.Context, subdomain string) (bool, error) {
	var taken bool
	if err := p.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM core.workspace WHERE subdomain = $1)`, subdomain).Scan(&taken); err != nil {
		return false, fmt.Errorf("look up subdomain: %w", err)
	}
	return taken, nil
}

func (p *PublicData) freeSubdomains(ctx context.Context, desired string, count int) ([]string, error) {
	base := desired
	if !isSubdomainValid(base) {
		base = subdomainSlug(desired)
	}
	if !isSubdomainValid(base) {
		base = randomSubdomain()
	}
	candidates := []string{base}
	for suffix := 2; suffix <= maxNumberedSuffixAttempts; suffix++ {
		candidates = append(candidates, numberedSubdomain(base, suffix))
	}
	for range maxRandomFallbackAttempts {
		candidates = append(candidates, randomSubdomain())
	}
	valid := slices.DeleteFunc(candidates, func(candidate string) bool {
		return !isSubdomainValid(candidate) || candidate == p.config.DefaultSubdomain
	})
	if len(valid) == 0 {
		return []string{randomSubdomain()}, nil
	}
	rows, err := p.pool.Query(ctx, `SELECT subdomain FROM core.workspace WHERE subdomain = ANY($1)`, valid)
	if err != nil {
		return nil, fmt.Errorf("look up subdomains: %w", err)
	}
	defer rows.Close()
	taken := map[string]bool{}
	for rows.Next() {
		var subdomain string
		if err := rows.Scan(&subdomain); err != nil {
			return nil, fmt.Errorf("read subdomain: %w", err)
		}
		taken[subdomain] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read subdomains: %w", err)
	}
	free := slices.DeleteFunc(valid, func(candidate string) bool { return taken[candidate] })
	if len(free) == 0 {
		return []string{randomSubdomain()}, nil
	}
	return free[:min(count, len(free))], nil
}

func (p *PublicData) SubdomainAvailability(ctx context.Context, subdomain string) (SubdomainAvailability, error) {
	result := SubdomainAvailability{IsValid: isSubdomainValid(subdomain)}
	if result.IsValid && subdomain != p.config.DefaultSubdomain {
		taken, err := p.subdomainTaken(ctx, subdomain)
		if err != nil {
			return SubdomainAvailability{}, err
		}
		result.Available = !taken
	}
	if result.Available {
		result.SuggestedSubdomains = []string{subdomain}
	} else {
		suggestions, err := p.freeSubdomains(ctx, subdomain, subdomainSuggestionsCount)
		if err != nil {
			return SubdomainAvailability{}, err
		}
		result.SuggestedSubdomains = suggestions
	}
	result.SuggestedSubdomain = result.SuggestedSubdomains[0]
	return result, nil
}

func (p *PublicData) CreationDefaults(ctx context.Context, userID string) (WorkspaceCreationDefaults, error) {
	var email string
	if err := p.pool.QueryRow(ctx, `SELECT email::text FROM core."user" WHERE id = $1::uuid AND "deletedAt" IS NULL`, userID).Scan(&email); err != nil {
		return WorkspaceCreationDefaults{}, fmt.Errorf("look up user: %w", err)
	}
	base := subdomainFromEmail(email)
	if base == "" {
		return WorkspaceCreationDefaults{}, nil
	}
	free, err := p.freeSubdomains(ctx, base, 1)
	if err != nil {
		return WorkspaceCreationDefaults{}, err
	}
	return WorkspaceCreationDefaults{DisplayName: strings.ToUpper(string([]rune(base)[:1])) + string([]rune(base)[1:]), Subdomain: free[0]}, nil
}
