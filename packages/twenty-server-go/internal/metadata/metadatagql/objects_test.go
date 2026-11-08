package metadatagql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/auth"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/metadatagql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/metadata/store"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/pgtest"
)

type verifier struct{}

func (verifier) Verify(context.Context, string) (auth.Principal, error) {
	return auth.Principal{UserID: "user-1"}, nil
}

// objectMetadataItems is the document twenty-front sends (modules/object-metadata/graphql).
const objectMetadataItems = `query ObjectMetadataItems {
  objects(paging: { first: 1000 }) {
    edges { node { ...ObjectMetadataFields } }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
  }
}
fragment ObjectMetadataFields on Object {
  id universalIdentifier nameSingular namePlural labelSingular labelPlural color description icon isRemote isActive isSystem
  isUIEditable isUICreatable writability createdAt updatedAt labelIdentifierFieldMetadataId imageIdentifierFieldMetadataId
  applicationId shortcut isLabelSyncedWithName isSearchable openRecordIn sharingReach readability duplicateCriteria
  searchFieldMetadataList { id fieldMetadataId tsVectorFieldMetadataId position createdAt updatedAt }
  indexMetadataList { id createdAt updatedAt name indexWhereClause indexType isUnique isCustom
    indexFieldMetadataList { id fieldMetadataId subFieldName createdAt updatedAt order } }
  fieldsList {
    id universalIdentifier type name label description icon isActive isSystem isUIEditable writability isNullable isUnique
    isSearchable createdAt updatedAt defaultValue options settings isLabelSyncedWithName morphId applicationId
    relation { type sourceObjectMetadata { id nameSingular namePlural } targetObjectMetadata { id nameSingular namePlural }
      sourceFieldMetadata { id name } targetFieldMetadata { id name } }
    morphRelations { type sourceObjectMetadata { id nameSingular namePlural } targetObjectMetadata { id nameSingular namePlural }
      sourceFieldMetadata { id name } targetFieldMetadata { id name } }
  }
}`

func newServer(t *testing.T) *httptest.Server {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), pgtest.New(t))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	upstream, err := url.Parse("http://node.invalid")
	if err != nil {
		t.Fatal(err)
	}
	goGraphQL := http.NewServeMux()
	goGraphQL.Handle("/metadata", metadatagql.NewHandler(store.New(pool), logger))
	server := httptest.NewServer(frontdoor.NewHandler(frontdoor.DefaultTable(), upstream, verifier{}, goGraphQL, logger))
	t.Cleanup(server.Close)
	return server
}

func send(t *testing.T, server *httptest.Server, operation, query string) map[string]any {
	t.Helper()
	body, err := json.Marshal(map[string]any{"operationName": operation, "query": query})
	if err != nil {
		t.Fatal(err)
	}
	req, err := http.NewRequestWithContext(t.Context(), http.MethodPost, server.URL+"/metadata", bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	resp, err := server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	var decoded map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		t.Fatalf("decode %s response: %v", operation, err)
	}
	return decoded
}

func nodes(t *testing.T, response map[string]any) map[string]map[string]any {
	t.Helper()
	data, ok := response["data"].(map[string]any)
	if !ok {
		t.Fatalf("response has no data: %v", response)
	}
	byName := map[string]map[string]any{}
	for _, edge := range data["objects"].(map[string]any)["edges"].([]any) {
		node := edge.(map[string]any)["node"].(map[string]any)
		byName[node["nameSingular"].(string)] = node
	}
	return byName
}

func TestObjectMetadataItems(t *testing.T) {
	t.Parallel()
	server := newServer(t)

	response := send(t, server, "ObjectMetadataItems", objectMetadataItems)
	if errs, hasErrors := response["errors"]; hasErrors {
		t.Fatalf("ObjectMetadataItems errors = %v", errs)
	}
	objects := nodes(t, response)

	t.Run("person carries its fields and relation", func(t *testing.T) {
		person, ok := objects["person"]
		if !ok {
			t.Fatalf("no person object among %d objects", len(objects))
		}
		var company map[string]any
		for _, field := range person["fieldsList"].([]any) {
			if field.(map[string]any)["name"] == "company" {
				company = field.(map[string]any)
			}
		}
		if company == nil {
			t.Fatal("person has no company field")
		}
		relation := company["relation"].(map[string]any)
		want := map[string]any{"id": objects["company"]["id"], "nameSingular": "company", "namePlural": "companies"}
		if diff := cmp.Diff(want, relation["targetObjectMetadata"]); diff != "" {
			t.Errorf("company relation target (-want +got):\n%s", diff)
		}
		if relation["type"] != "MANY_TO_ONE" {
			t.Errorf("company relation type = %v, want MANY_TO_ONE", relation["type"])
		}
	})

	t.Run("pageInfo reports a single page", func(t *testing.T) {
		pageInfo := response["data"].(map[string]any)["objects"].(map[string]any)["pageInfo"].(map[string]any)
		if pageInfo["hasNextPage"] != false || pageInfo["endCursor"] == nil {
			t.Errorf("pageInfo = %v, want no next page and an end cursor", pageInfo)
		}
	})

	t.Run("an invalid page size is a graphql error", func(t *testing.T) {
		response := send(t, server, "ObjectMetadataItems", `query ObjectMetadataItems { objects(paging: { first: 5000 }) { edges { node { id } } } }`)
		if errs, _ := response["errors"].([]any); len(errs) != 1 {
			t.Errorf("response = %v, want one error", response)
		}
	})
}
