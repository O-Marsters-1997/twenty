package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

func workspaceHandler(records, chat http.Handler) http.Handler {
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
		if json.Unmarshal(body, &request) == nil && request.OperationName == frontdoor.AnswerToolCallOperation {
			chat.ServeHTTP(w, r)
			return
		}
		records.ServeHTTP(w, r)
	})
}
