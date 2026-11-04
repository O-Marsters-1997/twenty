#!/bin/sh
command -v jq >/dev/null || { echo "Blocked: jq is required by this hook" >&2; exit 2; }
command=$(jq -r '.tool_input.command // empty')

deny() {
  echo "Blocked: $1. CI runs it; see 'Agent versus CI' in CLAUDE.md." >&2
  exit 2
}

matches() { printf '%s\n' "$command" | grep -Eq "$1"; }

matches 'nx (run )?test +twenty-(server|front|ui)( |$)|nx run twenty-(server|front|ui):test( |:|$)|nx (run-many|affected).*(-t|--target)[ =]test( |$)' && deny "package-wide nx test"
matches 'test:integration' && deny "server integration tests"
matches 'database:reset' && deny "database:reset"
matches 'storybook:build[ =]*twenty-ui|nx run twenty-ui:storybook:build|nx (run-many|affected).*storybook:build.*twenty-ui' && deny "twenty-ui storybook:build"
matches '(^|[^a-z])tsgo( |$)' && ! matches 'scripts/heavy +(npx +)?tsgo' && deny "bare tsgo, run it as 'scripts/heavy npx tsgo ...'"
exit 0
