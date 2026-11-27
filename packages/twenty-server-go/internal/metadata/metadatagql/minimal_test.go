package metadatagql_test

import (
	"slices"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/workspace"
)

const (
	companyObjectID = "0448bbe7-5fd2-4182-94fd-8f1754d01404"
	companyNameID   = "3038b5a9-2781-43da-b05d-43bbff33e3ca"
	companyLinkedin = "cdbf9c51-4fe0-4fa5-92b3-ea3a0ad4a223"
)

func seedCompanies(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	schema := workspace.SchemaName()
	for _, statement := range []string{
		`INSERT INTO ` + schema + `.company (name) SELECT 'Acme ' || n FROM generate_series(1, 20) n`,
		`INSERT INTO ` + schema + `.company (name, "deletedAt") VALUES ('Gone', now())`,
		`ANALYZE ` + schema + `.company`,
	} {
		if _, err := pool.Exec(t.Context(), statement); err != nil {
			t.Fatalf("seed %q: %v", statement, err)
		}
	}
	return pool
}

func TestObjectRecordCounts(t *testing.T) {
	t.Parallel()
	server := newServerOn(t, seedCompanies(t))

	response := send(t, server, "ObjectRecordCounts", `query ObjectRecordCounts { objectRecordCounts { objectNamePlural totalCount } }`)
	if errs, hasErrors := response["errors"]; hasErrors {
		t.Fatalf("ObjectRecordCounts errors = %v", errs)
	}
	counts := map[string]float64{}
	for _, item := range response["data"].(map[string]any)["objectRecordCounts"].([]any) {
		entry := item.(map[string]any)
		counts[entry["objectNamePlural"].(string)] = entry["totalCount"].(float64)
	}
	if counts["companies"] != 20 {
		t.Errorf("companies count = %v, want 20 live records", counts["companies"])
	}
	if got, ok := counts["people"]; !ok || got != 0 {
		t.Errorf("people count = %v, %v, want 0, true", got, ok)
	}
}

func TestMostlyEmptyFieldMetadataIds(t *testing.T) {
	t.Parallel()
	server := newServerOn(t, seedCompanies(t))

	response := send(t, server, "MostlyEmptyFieldMetadataIds",
		`query MostlyEmptyFieldMetadataIds { mostlyEmptyFieldMetadataIds(objectMetadataId: "`+companyObjectID+`") }`)
	if errs, hasErrors := response["errors"]; hasErrors {
		t.Fatalf("MostlyEmptyFieldMetadataIds errors = %v", errs)
	}
	var ids []string
	for _, id := range response["data"].(map[string]any)["mostlyEmptyFieldMetadataIds"].([]any) {
		ids = append(ids, id.(string))
	}
	if !slices.Contains(ids, companyLinkedin) {
		t.Errorf("mostly empty ids = %v, want the all-null linkedinLink field %s", ids, companyLinkedin)
	}
	if slices.Contains(ids, companyNameID) {
		t.Errorf("mostly empty ids = %v, want the filled name field %s absent", ids, companyNameID)
	}
}

func TestFindMinimalMetadata(t *testing.T) {
	t.Parallel()
	server := newServer(t)

	response := send(t, server, "FindMinimalMetadata", `query FindMinimalMetadata {
  minimalMetadata {
    objectMetadataItems { id nameSingular namePlural labelSingular labelPlural icon isActive isSystem isRemote }
    views { id type key objectMetadataId }
    collectionHashes { collectionName hash }
  }
}`)
	if errs, hasErrors := response["errors"]; hasErrors {
		t.Fatalf("FindMinimalMetadata errors = %v", errs)
	}
	minimal := response["data"].(map[string]any)["minimalMetadata"].(map[string]any)

	var company map[string]any
	for _, item := range minimal["objectMetadataItems"].([]any) {
		if entry := item.(map[string]any); entry["nameSingular"] == "company" {
			company = entry
		}
	}
	if company == nil || company["id"] != companyObjectID || company["namePlural"] != "companies" || company["isActive"] != true {
		t.Errorf("company item = %v, want id %s, namePlural companies, active", company, companyObjectID)
	}
	var companyIndexViews int
	for _, item := range minimal["views"].([]any) {
		if view := item.(map[string]any); view["objectMetadataId"] == companyObjectID && view["type"] == "TABLE" && view["key"] == "INDEX" {
			companyIndexViews++
		}
	}
	if companyIndexViews != 1 {
		t.Errorf("company INDEX table views = %d, want 1", companyIndexViews)
	}
	if hashes := minimal["collectionHashes"].([]any); len(hashes) != 0 {
		t.Errorf("collectionHashes = %v, want none so the front end refetches every collection", hashes)
	}
}
