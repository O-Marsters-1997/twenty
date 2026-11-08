package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

func metadataHandler(objects, views http.Handler) http.Handler {
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
		switch request.OperationName {
		case "ObjectMetadataItems", "GetToolIndex", "GetToolInputSchema":
			objects.ServeHTTP(w, r)
		default:
			views.ServeHTTP(w, r)
		}
	})
}
