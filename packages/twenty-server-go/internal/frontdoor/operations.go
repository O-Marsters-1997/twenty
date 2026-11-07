package frontdoor

type Endpoint string

const (
	EndpointWorkspace Endpoint = "/graphql"
	EndpointMetadata  Endpoint = "/metadata"
)

type Route string

const (
	RouteGo      Route = "go"
	RouteNode    Route = "node"
	RouteBlocked Route = "blocked"
)

type OperationTable map[Endpoint]map[string]Route // operation name → route; absent means RouteNode

// DefaultTable blocks the object and field mutations that change the frozen data model.
func DefaultTable() OperationTable {
	return OperationTable{
		EndpointMetadata: {
			"CreateOneObjectMetadataItem": RouteBlocked,
			"UpdateOneObjectMetadataItem": RouteBlocked,
			"DeleteOneObjectMetadataItem": RouteBlocked,
			"CreateOneFieldMetadataItem":  RouteBlocked,
			"UpdateOneFieldMetadataItem":  RouteBlocked,
			"DeleteOneFieldMetadataItem":  RouteBlocked,
		},
	}
}

var blockedMetadataFields = []string{
	"createOneObject", "updateOneObject", "deleteOneObject",
	"createOneField", "updateOneField", "deleteOneField",
}
