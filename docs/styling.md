# Styling

## Target conventions

These replace the Linaria and SCSS house rules in `CLAUDE.md`.

1. Import as `import * as stylex from '@stylexjs/stylex';`. One `const styles = stylex.create({...})` per file, below the component, with keys named for the element's role (`root`, `header`, `label`) or variant (`sizeSm`, `variantDanger`).
2. Apply with `{...stylex.props(styles.root, styles[size], isActive && styles.active, xstyle)}`. No `clsx`, no hand-joined `className`.
3. Components that can be restyled from outside take `xstyle?: stylex.StyleXStyles`, or `StyleXStyles<{ marginBlockStart?: unknown }>`-style restricted types for layout-only overrides, applied last. Public components don't take `className` or `style`. The one exception is a component that forwards to a third-party element that only accepts `className`.
4. Variants over dynamic styles. Enum props map to `styles[variant]`, booleans to `cond && styles.x`. Dynamic style functions (`width: (width: number) => ({ width })`) only for continuous values: drag positions, measured sizes, user-picked colours.
5. `style={{...}}` only where a library computes the values at runtime (virtualised list rows, Floating UI positions, Framer Motion). Everything static moves into `stylex.create`.
6. Tokens only from `.stylex.ts` files. `defineVars` for themeable values, `defineConsts` for breakpoints, z-index layers, durations and easing. Never a raw `var(--t-*)` string in component code.
7. Longhand properties (`paddingBlock`, `paddingInline`, `borderWidth`, `borderStyle`, `borderColor`). StyleX's shorthand handling is the most common source of surprises.
8. Child styling: put the style on the child. For parent-state effects (hovering a row reveals its actions, the `.hoverable-buttons` pattern) use `stylex.defineMarker()` with `stylex.when.ancestor(':hover', marker)`. For parent-driven layout (`ButtonGroup[data-attached] > :not(:first-child)`) the parent passes a variant down through context or props. No descendant selectors.
9. Component-scoped custom properties (`--tw-button-radius` and the rest) become `defineVars` in the component's own `Component.stylex.ts`. A parent overrides them with `stylex.createTheme`, not by setting raw custom properties.
10. Keyframes with `stylex.keyframes` in the file that uses them. `prefers-reduced-motion` and the hover-capable mixins become `defineConsts` media queries.
11. Third-party DOM (Monaco, react-datepicker, BlockNote/Mantine, react-grid-layout, react-data-grid, tiptap, react-flow) gets one plain CSS file per library under `twenty-ui/src/third-party-styles/` or `twenty-front/src/third-party-styles/`, inside `@layer third-party`, imported once where the library is mounted.
12. Lint: `@stylexjs/eslint-plugin` rules `valid-styles`, `no-unused`, `valid-shorthands`, `sort-keys` and `enforce-extension`, plus `no-restricted-imports` for `@linaria/*`, `*.module.scss` and `clsx` once each is gone.

## Base UI state

Base UI marks state with attributes on the element and also passes the same state to `className` and `style` when they're functions. In order of preference:

1. **Self attribute conditions, if the phase 1 spike shows they compile.** Keys like `':is([data-disabled])'` or `':is([data-starting-style])'` on the element itself. This is the smallest diff and keeps Base UI's transition timing exactly as it is.
2. **Otherwise, Base UI's state callback.** A shared helper in twenty-ui: `className={(state) => stylex.props(styles.popup, state.side === 'top' && styles.sideTop, ...).className}`. Base UI's state object carries `side`, `disabled`, `open` and `transitionStatus` (`'starting' | 'ending'`), so every attribute in the audit has a state equivalent.

Whichever wins is written into `docs/styling.md` in phase 1 and used everywhere. No mix of the two.

## Build architecture

- **twenty-ui compiles its own StyleX** with `@stylexjs/unplugin` in its Vite library build and keeps shipping one `dist/style.css`, as it does today with SCSS. Storybook and vitest for twenty-ui keep working standalone, and twenty-front's dependency on `dist/` doesn't change.
- **twenty-front compiles its own StyleX** and imports `twenty-ui/style.css` as it does now.
- **Tokens use literal `--t-*` names,** so a front style that reads `spacing['--t-spacing-4']` resolves to the same variable twenty-ui defines. No cross-package hash agreement is needed.
- **One layer order, declared once** in `twenty-front/src/index.css`: `@layer reset, third-party, twenty-ui, priority1, priority2, priority3;` (the names StyleX emits, see Spike outcomes). Front styles passed into a twenty-ui component through `xstyle` are merged by `stylex.props` at runtime, so only one class per property reaches the DOM. Layer order only matters where both stylesheets style the same element without going through `xstyle`. Confirm the layer names each build emits under `useCSSLayers` (and whether a layer prefix can be set per build) in phase 1, and rename the list to match.
- The alternative, shipping twenty-ui as uncompiled StyleX source and compiling it in twenty-front, dedupes atomic CSS across both packages. It's rejected for now because it breaks twenty-ui's standalone Storybook/vitest and changes how front consumes the package. Revisit if the CSS-size comparison in phase 8 shows meaningful duplication.

## Spike outcomes (twenty-ui, phase 1)

- **Layer names.** With `useCSSLayers: true` (`@stylexjs/unplugin` 0.19.2), twenty-ui's `dist/style.css` emits StyleX rules in `@layer priority1`, `priority2` and `priority3`, followed by the existing `@layer reset` and `@layer twenty-ui` SCSS layers. The names are fixed by StyleX; no per-build prefix was found. The list in Build architecture must use `priority1, priority2, priority3` rather than `stylex`. Front's build will emit the same names, so the two stylesheets share layers rather than getting separate ones.
- **Token variable names.** `defineVars` keyed by `--t-*` keeps the literal name: `:root, .x5vs46r { --t-accent-primary: ... }` and `padding-inline: var(--t-spacing-4)`. The existing `.light` / `.dark` classes keep working because they set the same names.
- **Token groups.** `generateThemeTokens.ts` splits on the first path segment, and on the first two when a branch has nested branches (`font.color.*` is `fontColor`). Top-level leaves such as `spacingMultiplicator` go in `general`.
- **Imports.** StyleX resolves `.stylex.ts` imports itself and ignores Vite aliases, so a file that reads tokens imports them by relative path (`../tokens.stylex`). From another package the import is `twenty-ui/theme/tokens.stylex`, which resolves to source.
- **Base UI state.** `':is([data-starting-style])'` and `':is([data-disabled])'` as keys on the element itself compile under the StyleX babel plugin. Convention 1 is the choice; whether the generated selector behaves in a browser is confirmed when the first Base UI component is converted.
- **Not spiked here.** Merging an `xstyle` compiled in front into a component from twenty-ui's `dist/` belongs to the front ticket.
