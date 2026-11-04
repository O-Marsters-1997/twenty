#!/bin/sh
hook="$(dirname "$0")/deny-ci-commands.sh"
fail=0
check() {
  printf '{"tool_input":{"command":"%s"}}' "$2" | "$hook" 2>/dev/null
  status=$?
  [ "$status" = "$1" ] || { echo "FAIL (exit $status, want $1): $2"; fail=1; }
}
check 2 "npx nx test twenty-server"
check 0 "npx jest packages/twenty-server/src/a.spec.ts --config=packages/twenty-server/jest.config.mjs"
check 2 "npx nx run twenty-server:test:integration:with-db-reset"
check 0 "npx nx lint:diff-with-main twenty-server"
check 2 "npx nx database:reset twenty-server"
check 0 "npx nx build twenty-shared"
check 2 "npx nx storybook:build twenty-ui"
check 0 "npx nx storybook:build twenty-front"
check 2 "npx tsgo -p tsconfig.json --noEmit"
check 0 "scripts/heavy npx tsgo -p tsconfig.json --noEmit"
check 2 "npx nx run twenty-server:test:unit"
check 2 "npx nx affected -t test"
check 0 "npx nx test twenty-shared"
check 2 "cd packages/heavy && npx tsgo --noEmit"
exit $fail
