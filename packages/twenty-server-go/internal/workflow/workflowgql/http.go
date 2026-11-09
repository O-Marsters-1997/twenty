package workflowgql

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	testRequestTimeout  = 30 * time.Second
	testRequestMaxBytes = 10 * 1024 * 1024
)

func testHTTPRequest(ctx context.Context, client *http.Client, input map[string]any) *HTTPTestResult {
	url, _ := input["url"].(string)
	method, _ := input["method"].(string)
	failed := fmt.Sprintf("HTTP %s request to %s failed", method, url)
	fail := func(cause string) *HTTPTestResult { return &HTTPTestResult{Message: failed, Error: cause} }

	ctx, cancel := context.WithTimeout(ctx, testRequestTimeout)
	defer cancel()

	headers := map[string]string{}
	if raw, ok := input["headers"].(map[string]any); ok {
		for name, value := range raw {
			headers[strings.ToLower(name)] = fmt.Sprint(value)
		}
	}
	var body io.Reader
	if payload := requestBody(method, input["body"]); payload != nil {
		body = bytes.NewReader(payload)
		if _, hasType := headers["content-type"]; !hasType {
			if _, isText := input["body"].(string); !isText {
				headers["content-type"] = "application/json"
			}
		}
	}
	request, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		return fail(err.Error())
	}
	for name, value := range headers {
		request.Header.Set(name, value)
	}
	response, err := client.Do(request)
	if err != nil {
		if ctx.Err() != nil {
			return fail(fmt.Sprintf("Request timed out after %d s", int(testRequestTimeout.Seconds())))
		}
		return fail(err.Error())
	}
	defer func() { _ = response.Body.Close() }()
	raw, err := io.ReadAll(io.LimitReader(response.Body, testRequestMaxBytes+1))
	if err != nil || len(raw) > testRequestMaxBytes {
		return fail("response could not be read")
	}

	var data any = string(raw)
	var decoded any
	if json.Unmarshal(raw, &decoded) == nil {
		data = decoded
	}
	status, statusText := float64(response.StatusCode), http.StatusText(response.StatusCode)
	result := &HTTPTestResult{Result: data, Status: &status, StatusText: &statusText, Headers: responseHeaders(response.Header)}
	if response.StatusCode >= http.StatusOK && response.StatusCode < http.StatusMultipleChoices {
		result.Success = true
		result.Message = fmt.Sprintf("HTTP %s request to %s completed successfully", method, url)
		return result
	}
	result.Message, result.Error = failed, data
	return result
}

func requestBody(method string, body any) []byte {
	if body == nil || body == "" {
		return nil
	}
	if method != http.MethodPost && method != http.MethodPut && method != http.MethodPatch {
		return nil
	}
	if text, isText := body.(string); isText {
		return []byte(text)
	}
	encoded, err := json.Marshal(body)
	if err != nil {
		return nil
	}
	return encoded
}

func responseHeaders(header http.Header) map[string]string {
	flattened := make(map[string]string, len(header))
	for name, values := range header {
		flattened[strings.ToLower(name)] = strings.Join(values, ", ")
	}
	return flattened
}
