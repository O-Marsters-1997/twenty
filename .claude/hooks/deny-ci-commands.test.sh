#!/bin/sh
hook="$(dirname "$0")/deny-ci-commands.sh"
fail=0
check() {
  printf '{"tool_input":{"command":"%s"}}' "$2" | "$hook" 2>/dev/null
  status=$?
  [ "$status" = "$1" ] || { echo "FAIL (exit $status, want $1): $2"; fail=1; }
}
check 2 "npx moon run twenty-front:test"
check 2 "npx moon run twenty-ui:test"
check 2 "npx moon run twenty-front:lint twenty-front:test"
check 2 "npx moon run twenty-front:test -- --shard=1/3"
check 0 "npx moon run twenty-front:test -- src/foo.spec.ts"
check 0 "npx moon run twenty-ui:test -- src/foo.test.ts"
check 2 "npx moon run :test"
check 2 "npx moon ci"
check 0 "npx moon run twenty-shared:test"
check 0 "npx moon run twenty-utils:test"
check 0 "npx moon run twenty-front:lint-diff"
check 0 "npx moon run twenty-shared:build"
check 0 "npx moon run twenty-front:storybook-build"
check 0 "npx moon run twenty-ui:storybook-build"
check 2 "npx tsgo -p tsconfig.json --noEmit"
check 0 "scripts/heavy npx tsgo -p tsconfig.json --noEmit"
check 2 "cd packages/heavy && npx tsgo --noEmit"
exit $fail
