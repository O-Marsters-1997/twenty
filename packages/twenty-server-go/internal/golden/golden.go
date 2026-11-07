package golden

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const placeholder = "<ignored>"

type Case struct {
	Name      string          `json:"name"`
	Operation string          `json:"operation"`
	Fixture   string          `json:"fixture"`
	Endpoint  string          `json:"endpoint"`
	Query     string          `json:"query"`
	Variables map[string]any  `json:"variables,omitempty"`
	Response  json.RawMessage `json:"response"`
}

func Path(dir, name string) string {
	return filepath.Join(dir, name+".json")
}

func Load(dir, name string) (Case, error) {
	var c Case
	raw, err := os.ReadFile(Path(dir, name))
	if err != nil {
		return c, fmt.Errorf("read golden file: %w", err)
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return c, fmt.Errorf("decode golden file: %w", err)
	}
	return c, nil
}

func Save(dir string, c Case) error {
	raw, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("encode golden file: %w", err)
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return fmt.Errorf("create golden dir: %w", err)
	}
	if err := os.WriteFile(Path(dir, c.Name), append(raw, '\n'), 0o600); err != nil {
		return fmt.Errorf("write golden file: %w", err)
	}
	return nil
}

func Send(client *http.Client, baseURL, token string, c Case) (json.RawMessage, error) {
	body, err := json.Marshal(map[string]any{"operationName": c.Operation, "query": c.Query, "variables": c.Variables})
	if err != nil {
		return nil, fmt.Errorf("encode request: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, strings.TrimRight(baseURL, "/")+c.Endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	return raw, nil
}

func Mask(raw json.RawMessage, paths []string) (any, error) {
	var doc any
	if err := json.Unmarshal(raw, &doc); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	for _, path := range paths {
		doc = mask(doc, strings.Split(path, "."))
	}
	return doc, nil
}

func mask(node any, segments []string) any {
	if len(segments) == 0 {
		return placeholder
	}
	switch typed := node.(type) {
	case map[string]any:
		if child, ok := typed[segments[0]]; ok {
			typed[segments[0]] = mask(child, segments[1:])
		}
	case []any:
		if segments[0] == "*" {
			for i := range typed {
				typed[i] = mask(typed[i], segments[1:])
			}
		}
	}
	return node
}
