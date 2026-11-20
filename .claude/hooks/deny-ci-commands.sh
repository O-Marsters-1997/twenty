#!/bin/sh
command -v jq >/dev/null || { echo "Blocked: jq is required by this hook" >&2; exit 2; }
command=$(jq -r '.tool_input.command // empty')

deny() {
  echo "Blocked: $1. CI runs it; see 'Agent versus CI' in CLAUDE.md." >&2
  exit 2
}

matches() { printf '%s\n' "$command" | grep -Eq "$1"; }

matches '(^|[^a-z])moon +run +.*twenty-(front|ui):test( |$)' && ! matches ' -- +[^- ]' && deny "package-wide moon test, pass a file after --"
matches '(^|[^a-z])moon +run +(.* )?:test( |$)|(^|[^a-z])moon +ci( |$)' && deny "all-projects moon test run"
matches '(^|[^a-z])tsgo( |$)' && ! matches 'scripts/heavy +(npx +)?tsgo' && deny "bare tsgo, run it as 'scripts/heavy npx tsgo ...'"
exit 0
