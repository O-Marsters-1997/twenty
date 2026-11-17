# Oxlint Migration TODO

This file tracks what was lost or temporarily disabled during the ESLint to Oxlint migration, and what needs to be re-activated or addressed.

## IDE Integration

The `oxc.oxc-vscode` extension provides inline diagnostics for built-in oxlint rules but does **not** yet support `jsPlugins` (custom `twenty/*` rules). Custom rule violations are only caught by `nx lint` and CI.

## Remaining Re-activation Plan

1. **Folder structure enforcement** (`twenty-front`): Re-implemented as `twenty/folder-structure` custom oxlint rule (enabled as `"warn"`). 403 pre-existing violations to address:
   - 160 non-kebab-case module folder names (e.g. `graphWidgetBarChart` → `graph-widget-bar-chart`)
   - 215 modules nested deeper than 4 levels
   - 28 util/hook file naming violations (`.util.ts` suffixes, kebab-case filenames, PascalCase)
   - Promote to `"error"` once violations are resolved
