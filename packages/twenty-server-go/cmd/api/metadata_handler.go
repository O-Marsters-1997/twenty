package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"slices"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

const objectMetadataOperation = "ObjectMetadataItems"

func metadataHandler(objects, chat, views http.Handler) http.Handler {
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
			return
		case slices.Contains(frontdoor.ChatOperations, request.OperationName):
			chat.ServeHTTP(w, r)
			return
		}
		views.ServeHTTP(w, r)
	})
}
