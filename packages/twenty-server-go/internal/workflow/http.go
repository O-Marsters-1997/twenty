package workflow

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type httpRequestAction struct{ client *http.Client }

// NewHTTPRequestAction returns the HTTP_REQUEST action; its result is {"status": int, "body": string}.
// A non-2xx response is a result, not an error.
func NewHTTPRequestAction(client *http.Client) Action { return httpRequestAction{client} }

func (httpRequestAction) Type() ActionType { return ActionTypeHTTPRequest }

func (a httpRequestAction) Run(ctx context.Context, input StepInput) (StepOutput, error) {
	var settings struct {
		URL     string
		Method  string
		Headers map[string]string
		Body    json.RawMessage // a JSON string is sent as its text, any other JSON value as-is
	}
	if err := json.Unmarshal(input.Settings, &settings); err != nil {
		return StepOutput{}, fmt.Errorf("decode %s settings: %w", ActionTypeHTTPRequest, err)
	}
	body := []byte(settings.Body)
	if len(body) > 0 && body[0] == '"' {
		var text string
		if err := json.Unmarshal(body, &text); err != nil {
			return StepOutput{}, fmt.Errorf("decode request body: %w", err)
		}
		body = []byte(text)
	}
	if string(body) == "null" {
		body = nil
	}
	request, err := http.NewRequestWithContext(ctx, settings.Method, settings.URL, bytes.NewReader(body))
	if err != nil {
		return StepOutput{}, fmt.Errorf("build request: %w", err)
	}
	for name, value := range settings.Headers {
		request.Header.Set(name, value)
	}
	response, err := a.client.Do(request)
	if err != nil {
		return StepOutput{}, fmt.Errorf("send request: %w", err)
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return StepOutput{}, fmt.Errorf("read response: %w", err)
	}
	return StepOutput{Result: map[string]any{"status": response.StatusCode, "body": string(responseBody)}}, nil
}
