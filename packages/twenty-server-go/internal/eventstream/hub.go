package eventstream

import (
	"encoding/json"
	"errors"
	"reflect"
	"sync"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/records"
)

var (
	ErrStreamExists  = errors.New("event stream already exists")
	ErrNotAuthorized = errors.New("you are not authorized to perform this action")
)

const streamBuffer = 256

type Owner struct {
	UserWorkspaceID string
	APIKeyID        string
}

func (o Owner) matches(other Owner) bool {
	if other.UserWorkspaceID != "" {
		return o.UserWorkspaceID == other.UserWorkspaceID
	}
	return other.APIKeyID != "" && o.APIKeyID == other.APIKeyID
}

type Event struct {
	Action             string          `json:"action"`
	ObjectNameSingular string          `json:"objectNameSingular"`
	RecordID           string          `json:"recordId"`
	UserID             *string         `json:"userId"`
	WorkspaceMemberID  *string         `json:"workspaceMemberId"`
	Properties         EventProperties `json:"properties"`
}

type EventProperties struct {
	UpdatedFields []string                   `json:"updatedFields"`
	Before        json.RawMessage            `json:"before"`
	After         json.RawMessage            `json:"after"`
	Diff          map[string]json.RawMessage `json:"diff"`
}

type EventWithQueryIDs struct {
	QueryIDs          []string `json:"queryIds"`
	ObjectRecordEvent Event    `json:"objectRecordEvent"`
}

type Stream struct {
	hub     *Hub
	key     streamKey
	owner   Owner
	queries map[string]string
	events  chan []EventWithQueryIDs
	closed  bool
}

func (s *Stream) Events() <-chan []EventWithQueryIDs { return s.events }

func (s *Stream) Close() {
	s.hub.mu.Lock()
	defer s.hub.mu.Unlock()
	s.closeLocked()
	if s.hub.streams[s.key] == s {
		delete(s.hub.streams, s.key)
	}
}

func (s *Stream) closeLocked() {
	if !s.closed {
		s.closed = true
		close(s.events)
	}
}

type streamKey struct{ workspaceID, streamID string }

type Hub struct {
	mu      sync.Mutex
	streams map[streamKey]*Stream
}

func NewHub() *Hub { return &Hub{streams: map[streamKey]*Stream{}} }

func (h *Hub) Open(workspaceID, streamID string, owner Owner) (*Stream, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	key := streamKey{workspaceID, streamID}
	if existing, found := h.streams[key]; found {
		if !existing.owner.matches(owner) {
			return nil, ErrStreamExists
		}
		existing.closeLocked()
	}
	stream := &Stream{hub: h, key: key, owner: owner, queries: map[string]string{}, events: make(chan []EventWithQueryIDs, streamBuffer)}
	h.streams[key] = stream
	return stream, nil
}

func (h *Hub) AddQuery(workspaceID, streamID string, owner Owner, queryID string, operationSignature map[string]any) (bool, error) {
	return h.withStream(workspaceID, streamID, owner, func(stream *Stream) {
		objectName, _ := operationSignature["objectNameSingular"].(string)
		stream.queries[queryID] = objectName
	})
}

func (h *Hub) RemoveQuery(workspaceID, streamID string, owner Owner, queryID string) (bool, error) {
	return h.withStream(workspaceID, streamID, owner, func(stream *Stream) { delete(stream.queries, queryID) })
}

func (h *Hub) withStream(workspaceID, streamID string, owner Owner, change func(*Stream)) (bool, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	stream, found := h.streams[streamKey{workspaceID, streamID}]
	if !found {
		return false, nil
	}
	if !stream.owner.matches(owner) {
		return false, ErrNotAuthorized
	}
	change(stream)
	return true, nil
}

func (h *Hub) Publish(workspaceID string, event Event) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for key, stream := range h.streams {
		if key.workspaceID != workspaceID {
			continue
		}
		var queryIDs []string
		for queryID, objectName := range stream.queries {
			if objectName == event.ObjectNameSingular {
				queryIDs = append(queryIDs, queryID)
			}
		}
		if len(queryIDs) == 0 {
			continue
		}
		select {
		case stream.events <- []EventWithQueryIDs{{QueryIDs: queryIDs, ObjectRecordEvent: event}}:
		default:
		}
	}
}

func FromRecordEvent(event records.RecordEvent) Event {
	converted := Event{
		Action:             string(event.Kind),
		ObjectNameSingular: event.Object,
		RecordID:           event.RecordID,
		Properties:         EventProperties{Before: event.Before, After: event.After},
	}
	if event.Actor.WorkspaceMemberID != "" {
		converted.WorkspaceMemberID = &event.Actor.WorkspaceMemberID
	}
	if event.Kind == records.EventUpdated {
		converted.Properties.UpdatedFields, converted.Properties.Diff = diff(event.Before, event.After)
	}
	return converted
}

func diff(before, after json.RawMessage) ([]string, map[string]json.RawMessage) {
	var beforeFields, afterFields map[string]json.RawMessage
	if json.Unmarshal(before, &beforeFields) != nil || json.Unmarshal(after, &afterFields) != nil {
		return nil, nil
	}
	changed := []string{}
	changes := map[string]json.RawMessage{}
	for field, afterValue := range afterFields {
		beforeValue, hadBefore := beforeFields[field]
		if hadBefore && sameJSON(beforeValue, afterValue) {
			continue
		}
		if !hadBefore {
			beforeValue = json.RawMessage("null")
		}
		pair, err := json.Marshal(map[string]json.RawMessage{"before": beforeValue, "after": afterValue})
		if err != nil {
			continue
		}
		changed = append(changed, field)
		changes[field] = pair
	}
	return changed, changes
}

func sameJSON(left, right json.RawMessage) bool {
	var leftValue, rightValue any
	if json.Unmarshal(left, &leftValue) != nil || json.Unmarshal(right, &rightValue) != nil {
		return false
	}
	return reflect.DeepEqual(leftValue, rightValue)
}
