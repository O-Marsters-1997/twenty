package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/golden"
)

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, "golden-record:", err)
		os.Exit(1)
	}
}

func run(args []string, out io.Writer) error {
	flags := flag.NewFlagSet("golden-record", flag.ContinueOnError)
	node := flags.String("node", "http://localhost:3000", "base URL of the running Node server")
	token := flags.String("token", "", "bearer token for the fixture workspace")
	dir := flags.String("dir", "testdata/golden", "directory for golden files")
	name := flags.String("name", "", "golden file name")
	operation := flags.String("operation", "", "GraphQL operation name")
	endpoint := flags.String("endpoint", "/graphql", "/graphql or /metadata")
	queryFile := flags.String("query-file", "", "file holding the GraphQL document")
	variables := flags.String("variables", "{}", "variables as JSON")
	fixture := flags.String("fixture", "", "name of the fixture the server was seeded with")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *name == "" || *operation == "" || *queryFile == "" || *fixture == "" {
		return errors.New("-name, -operation, -query-file and -fixture are required")
	}
	query, err := os.ReadFile(*queryFile)
	if err != nil {
		return fmt.Errorf("read query file: %w", err)
	}
	c := golden.Case{Name: *name, Operation: *operation, Fixture: *fixture, Endpoint: *endpoint, Query: string(query)}
	if err := json.Unmarshal([]byte(*variables), &c.Variables); err != nil {
		return fmt.Errorf("decode variables: %w", err)
	}
	if c.Response, err = golden.Send(&http.Client{Timeout: 30 * time.Second},*node, *token, c); err != nil {
		return err
	}
	if !json.Valid(c.Response) {
		return fmt.Errorf("node response is not JSON: %s", c.Response)
	}
	if err := golden.Save(*dir, c); err != nil {
		return err
	}
	_, err = fmt.Fprintln(out, "recorded", golden.Path(*dir, c.Name))
	return err
}
