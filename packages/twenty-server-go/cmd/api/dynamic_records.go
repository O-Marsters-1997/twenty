package main

import (
	"log/slog"
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/recordsgql"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records/store"
)

var duplicateCriteria = map[string][][]string{
	"person":  {{"nameFirstName", "nameLastName"}, {"linkedinLinkPrimaryLinkUrl"}, {"emailsPrimaryEmail"}},
	"company": {{"name"}, {"domainNamePrimaryLinkUrl"}},
}

func dynamicRecords(pool *pgxpool.Pool, logger *slog.Logger) (http.Handler, func(operation string) bool) {
	newStore := func(object model.Object) recordsgql.DynamicStore { return store.NewDynamic(pool, object) }
	var objects []recordsgql.DynamicObject
	var operations []string
	for _, singular := range frontdoor.RuntimeBuiltObjects {
		object := model.Objects[slices.IndexFunc(model.Objects, func(candidate model.Object) bool { return candidate.NameSingular == singular })]
		objects = append(objects, recordsgql.DynamicObject{Object: object, Store: newStore(object), DuplicateCriteria: duplicateCriteria[singular]})
		operations = append(operations, frontdoor.RecordOperations(object)...)
	}
	return recordsgql.NewDynamic(objects, newStore, logger), func(operation string) bool { return slices.Contains(operations, operation) }
}
