package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"slices"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
)

var objectOperations = []string{"ObjectMetadataItems", "GetToolIndex", "GetToolInputSchema"}

func metadataHandler(objects, chat, skills, views, agents, messaging http.Handler, agentOperations []string) http.Handler {
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
		case slices.Contains(objectOperations, request.OperationName):
			objects.ServeHTTP(w, r)
		case slices.Contains(agentOperations, request.OperationName):
			agents.ServeHTTP(w, r)
		case slices.Contains(frontdoor.MessagingOperations, request.OperationName):
			messaging.ServeHTTP(w, r)
		case slices.Contains(frontdoor.ChatOperations, request.OperationName):
			chat.ServeHTTP(w, r)
		case slices.Contains(frontdoor.SkillOperations, request.OperationName):
			skills.ServeHTTP(w, r)
		default:
			views.ServeHTTP(w, r)
		}
	})
}
