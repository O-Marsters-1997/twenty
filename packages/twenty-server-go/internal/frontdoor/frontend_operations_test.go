package frontdoor_test

import (
	"flag"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/frontdoor"
	"github.com/twentyhq/twenty/packages/twenty-server-go/internal/model"
)

var updatePending = flag.Bool("update-pending", false, "rewrite testdata/node-pending-operations.txt from the current routes")

const (
	frontEndSource  = "../../../twenty-front/src"
	pendingFile     = "testdata/node-pending-operations.txt"
	recordsPrefix   = "records:"
	operationSyntax = `(?m)^\s*(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)\s*[({]`
)

var skippedDirectories = []string{"__tests__", "__mocks__", "__stories__", "generated", "generated-metadata", "testing"}

func frontEndOperations(t *testing.T) []string {
	t.Helper()
	syntax := regexp.MustCompile(operationSyntax)
	found := map[string]bool{}
	err := filepath.WalkDir(frontEndSource, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if slices.Contains(skippedDirectories, entry.Name()) {
				return filepath.SkipDir
			}
			return nil
		}
		name := entry.Name()
		if strings.Contains(name, ".test.") || strings.Contains(name, ".stories.") || !(strings.HasSuffix(name, ".ts") || strings.HasSuffix(name, ".tsx")) {
			return nil
		}
		source, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, match := range syntax.FindAllSubmatch(source, -1) {
			found[string(match[1])] = true
		}
		return nil
	})
	if err != nil {
		t.Fatalf("scan front end operations: %v", err)
	}
	operations := make([]string, 0, len(found))
	for operation := range found {
		operations = append(operations, operation)
	}
	slices.Sort(operations)
	return operations
}

func capitalize(name string) string {
	return strings.ToUpper(name[:1]) + name[1:]
}

func runtimeBuiltRecordOperations(object model.Object) []string {
	singular := capitalize(object.NameSingular)
	plural := capitalize(object.NamePlural)
	return []string{
		"FindMany" + plural, "FindOne" + singular, "FindDuplicate" + singular,
		"Create" + plural, "CreateOne" + singular, "UpdateOne" + singular, "UpdateMany" + plural,
		"DeleteOne" + singular, "DeleteMany" + plural, "DestroyOne" + singular, "DestroyMany" + plural,
		"RestoreMany" + plural, "Merge" + plural, "GroupBy" + plural,
		"Aggregate" + plural, plural + "GroupByAggregates", plural + "GroupByRecords",
	}
}

func isRouted(table frontdoor.OperationTable, operation string) bool {
	for _, routes := range table {
		if route, ok := routes[operation]; ok && route != frontdoor.RouteNode {
			return true
		}
	}
	return false
}

func nodeBoundOperations(t *testing.T) []string {
	t.Helper()
	table := frontdoor.DefaultTable()
	var nodeBound []string
	for _, operation := range frontEndOperations(t) {
		if !isRouted(table, operation) {
			nodeBound = append(nodeBound, operation)
		}
	}
	for _, object := range model.Objects {
		if slices.ContainsFunc(runtimeBuiltRecordOperations(object), func(operation string) bool { return !isRouted(table, operation) }) {
			nodeBound = append(nodeBound, recordsPrefix+object.NameSingular)
		}
	}
	slices.Sort(nodeBound)
	return nodeBound
}

func readPending(t *testing.T) []string {
	t.Helper()
	content, err := os.ReadFile(pendingFile)
	if err != nil {
		t.Fatalf("read %s: %v", pendingFile, err)
	}
	var pending []string
	for _, line := range strings.Split(string(content), "\n") {
		if line = strings.TrimSpace(line); line != "" && !strings.HasPrefix(line, "#") {
			pending = append(pending, line)
		}
	}
	return pending
}

func TestFrontEndOperations(t *testing.T) {
	nodeBound := nodeBoundOperations(t)
	if *updatePending {
		header := "# Front-end operations still answered by Node. Each entry is blocked by a follow-up ticket\n" +
			"# under project:go-backend-migration-node-removal; the list must be empty before #197 deletes Node.\n" +
			"# records:<object> stands for the runtime-built record operations of that object.\n"
		if err := os.WriteFile(pendingFile, []byte(header+strings.Join(nodeBound, "\n")+"\n"), 0o644); err != nil {
			t.Fatalf("write %s: %v", pendingFile, err)
		}
		return
	}
	pending := readPending(t)
	t.Run("every Node-bound operation is pending", func(t *testing.T) {
		for _, operation := range nodeBound {
			if !slices.Contains(pending, operation) {
				t.Errorf("%s resolves to RouteNode: route it to Go, cut it, or list it in %s with a follow-up ticket", operation, pendingFile)
			}
		}
	})
	t.Run("every pending operation is still Node-bound", func(t *testing.T) {
		for _, operation := range pending {
			if !slices.Contains(nodeBound, operation) {
				t.Errorf("%s is listed in %s but no longer resolves to RouteNode: remove it from the list", operation, pendingFile)
			}
		}
	})
}
