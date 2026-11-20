# Twenty end-to-end (E2E) Testing

## Prerequisite

Installing the browsers:

```
npx moon run twenty-e2e-testing:setup
```

### Run end-to-end tests

```
npx moon run twenty-e2e-testing:test
```

### Start the interactive UI mode

```
npx moon run twenty-e2e-testing:test -- --ui
```

### Run test in specific file
```
npx moon run twenty-e2e-testing:test -- <filename>
```

Example (location of the test must be specified from the root of `twenty-e2e-testing` package):
```
npx moon run twenty-e2e-testing:test -- tests/login.spec.ts
```

### Runs the tests in debug mode.
```
npx moon run twenty-e2e-testing:test -- --debug
```

### Show report after tests
```
cd packages/twenty-e2e-testing && bunx playwright show-report
```

## Q&A

#### Why there's `path.resolve()` everywhere?
That's thanks to differences in root directory when running tests using commands and using IDE. When running tests with commands, 
the root directory is `twenty/packages/twenty-e2e-testing`, for IDE it depends on how someone sets the configuration. This way, it
ensures that no matter which IDE or OS Shell is used, the result will be the same.
