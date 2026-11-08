package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"slices"
)

const objectMetadataOperation = "ObjectMetadataItems"

func metadataHandler(objects, views, agents http.Handler, agentOperations []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "read body", http.StatusBadRequest)
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))
		var request struct {
			OperationName string `json:"operationName"`
		}
		if err := json.Unmarshal(body, &request); err != nil {
			views.ServeHTTP(w, r)
			return
		}
		switch {
		case request.OperationName == objectMetadataOperation:
			objects.ServeHTTP(w, r)
		case slices.Contains(agentOperations, request.OperationName):
			agents.ServeHTTP(w, r)
		default:
			views.ServeHTTP(w, r)
		}
	})
}
