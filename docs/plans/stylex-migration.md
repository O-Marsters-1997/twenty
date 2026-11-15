# Plan: StyleX everywhere

> Label: project:stylex
> Feature branch: feature/stylex

All component styling in the monorepo moves to StyleX (`@stylexjs/stylex`, `@stylexjs/unplugin`). That means `twenty-front`'s Linaria (`@linaria/react`, `@linaria/core`, `@wyw-in-js/vite`), `twenty-ui`'s SCSS modules (`sass`, `sass-embedded`, `vite-plugin-sass-dts`) and static `style={{...}}` props. The old systems keep running until their last file is converted, so every phase ships on its own and `main` stays green.

Two areas don't use StyleX, both because of outside constraints:

- **Emails (`twenty-emails`) use react-email's `<Tailwind>` component** (see [Phase 9](#phase-9-emails)). Email clients drop class-based CSS, so email styles have to end up inline. StyleX's output is class names plus a stylesheet. react-email's `<Tailwind>` turns utility classes into inline styles at render time, which is the approach react-email recommends.
- **One global stylesheet per app** stays plain CSS: the reset, `html`/`body`, `color-scheme`, `@font-face` and the dnd-kit / floating-ui zoom fix in `viewport-zoom.css`. StyleX has no global selector API by design; its docs say to keep the reset in a CSS file.

Third-party DOM overrides (Monaco, react-datepicker, BlockNote, ...) are plain CSS too, for the same reason: StyleX only styles elements you put `stylex.props` on. That is the full list of non-StyleX CSS that stays.

## Audit

### twenty-front (Linaria)

| Measure (twenty-front/src) | Count |
| --- | --- |
| Files importing Linaria | 1,171 |
| `styled.*` / `css` blocks | 2,694 |
| Blocks with no prop interpolation and no nested selector | 2,141 (80%) |
| Files with only such blocks | 777 (66%) |
| Prop interpolations `${({ x }) => ...}` | 738 in 355 blocks, 268 files |
| `styled(Component)` wrappers | 101 (8 wrap `motion.*`) |
| Nested non-pseudo selectors | 657 in 213 files |
| `${StyledX}` component selectors | 11 in 6 files |
| `@media` blocks | 123 (47 mobile, 26 reduced-motion, 23 print, 9 hover) |
| `!important` | 49 |
| `themeCssVariables` references | 6,068 in 954 files |
| `style={{...}}` | 162 |
| Plain CSS files | `index.css`, `viewport-zoom.css`, `welcomeHalftone.css` |

Biggest areas: `modules/settings` (201 files), `modules/object-record` (175), `modules/ui` (152), `modules/page-layout` (80), `modules/ai` (75), `modules/workflow` (69), `modules/side-panel` (67), `modules/activities` (65).

Third-party DOM reached by nested selectors: `.react-datepicker` (37), BlockNote `.bn-*` / `.mantine-*` (~25), `.react-grid-*` (10), `.rdg-cell` (9), `.tiptap` (7), `.react-flow` (5).

### twenty-ui (SCSS modules)

| Measure (twenty-ui/src) | Count |
| --- | --- |
| `*.module.scss` | 102 (5,300 lines across all SCSS) |
| `.tsx` files importing a module | 244 |
| Files composing classes with `clsx` | 91 |
| Components exposing `className` | 84 |
| Self state/variant selectors `&[data-*]`, `&.x` | 262 (`data-side` 40, `data-variant` 23, `data-disabled` 18, `data-ending-style` 14, `data-color` 14, `data-starting-style` 9, ...) |
| Nested child selectors | 56 |
| `:global(...)` | 11 (Monaco internals and the `.hoverable-buttons` hover hook) |
| Component custom properties `--tw-*` | 58 distinct |
| `@keyframes` | 6 |
| Mixins | 8 (`focus-ring`, `square-button`, `hover-capable`, `hover-capable-without-touch`, `card-owner`, ...) |
| `style={{...}}` | 149 |
| Global SCSS | `styles/base/reset.scss`, `styles/abstracts/*` |

twenty-ui is built on Base UI (`@base-ui/react`, 170 importing files across both packages). Most `&[data-*]` selectors match attributes Base UI sets on the element itself (`data-side`, `data-disabled`, `data-starting-style`, `data-ending-style`). The rest (`data-variant`, `data-size`, `data-color`) are attributes twenty-ui sets from its own props so the SCSS can see them.

twenty-front consumes twenty-ui through its built `dist/` (`exports` points at `dist/*.mjs` and `dist/style.css`).

### What makes this tractable

- **Tokens are already CSS custom properties.** `themeCssVariables` is a generated map of 1,001 `var(--t-*)` strings, and twenty-ui's SCSS uses `var(--t-*)` directly (898 references). StyleX `defineVars` keeps any key that starts with `--` as the literal variable name, so every package keeps reading the same variables and nothing is hashed across a package boundary.
- **80% of Linaria blocks are static,** so a codemod can do them.
- **twenty-ui's variant attributes map one to one onto StyleX variants:** `&[data-size='sm']` becomes `styles.sizeSm`, picked from the `size` prop.
- **Jest never ran Linaria or SCSS,** so no test depends on generated class names.

### What is hard

- **Front prop interpolations (738)** and **nested selectors (657 front, 56 ui).** StyleX has no runtime templates and no descendant selectors.
- **Base UI state attributes on the element itself.** StyleX conditions are pseudo-classes, media queries and `stylex.when.*` relations to a marked element. A spike in phase 1 settles whether self-attribute conditions compile (see [Base UI state](#base-ui-state)).
- **Wrapping and restyling.** 101 Linaria `styled(Component)` wrappers plus every front file that passes `className` to a twenty-ui component need an `xstyle` prop.
- **Two compile units.** twenty-ui builds its own `dist/`, and twenty-front compiles its own code. Their StyleX output has to sit in one cascade.

## Target conventions

These replace the Linaria and SCSS house rules in `CLAUDE.md`, and go into `docs/styling.md`.

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

### Base UI state

Base UI marks state with attributes on the element and also passes the same state to `className` and `style` when they're functions. In order of preference:

1. **Self attribute conditions, if the phase 1 spike shows they compile.** Keys like `':is([data-disabled])'` or `':is([data-starting-style])'` on the element itself. This is the smallest diff and keeps Base UI's transition timing exactly as it is.
2. **Otherwise, Base UI's state callback.** A shared helper in twenty-ui: `className={(state) => stylex.props(styles.popup, state.side === 'top' && styles.sideTop, ...).className}`. Base UI's state object carries `side`, `disabled`, `open` and `transitionStatus` (`'starting' | 'ending'`), so every attribute in the audit has a state equivalent.

Whichever wins is written into `docs/styling.md` in phase 1 and used everywhere. No mix of the two.

## Build architecture

- **twenty-ui compiles its own StyleX** with `@stylexjs/unplugin` in its Vite library build and keeps shipping one `dist/style.css`, as it does today with SCSS. Storybook and vitest for twenty-ui keep working standalone, and twenty-front's dependency on `dist/` doesn't change.
- **twenty-front compiles its own StyleX** and imports `twenty-ui/style.css` as it does now.
- **Tokens use literal `--t-*` names,** so a front style that reads `spacing['--t-spacing-4']` resolves to the same variable twenty-ui defines. No cross-package hash agreement is needed.
- **One layer order, declared once** in `twenty-front/src/index.css`: `@layer reset, third-party, twenty-ui-stylex, stylex;`. Front styles passed into a twenty-ui component through `xstyle` are merged by `stylex.props` at runtime, so only one class per property reaches the DOM. Layer order only matters where both stylesheets style the same element without going through `xstyle`. Confirm the layer names each build emits under `useCSSLayers` (and whether a layer prefix can be set per build) in phase 1, and rename the list to match.
- The alternative, shipping twenty-ui as uncompiled StyleX source and compiling it in twenty-front, dedupes atomic CSS across both packages. It's rejected for now because it breaks twenty-ui's standalone Storybook/vitest and changes how front consumes the package. Revisit if the CSS-size comparison in phase 8 shows meaningful duplication.

## Phases

1. [Foundation](#phase-1-foundation)
2. [Tokens](#phase-2-tokens)
3. [twenty-ui primitives](#phase-3-twenty-ui-primitives)
4. [twenty-ui components](#phase-4-twenty-ui-components)
5. [Front codemod and pilot](#phase-5-front-codemod-and-pilot)
6. [Front shared UI](#phase-6-front-shared-ui)
7. [Front feature modules](#phase-7-front-feature-modules)
8. [Remove the old systems](#phase-8-remove-the-old-systems)
9. [Emails](#phase-9-emails)

Phases 3-4 (twenty-ui) and 5 (front pilot) can run in parallel once phase 2 lands. Phase 6 needs phase 3, because that's when twenty-ui components gain `xstyle`. Phase 9 shares nothing with the others and can run at any time.

## Phase 1: Foundation

StyleX compiles in both packages alongside the existing systems. Nothing is converted yet.

**Modified**

```ts
// packages/twenty-front/vite.config.ts and packages/twenty-ui/vite.config.ts
import stylex from '@stylexjs/unplugin';

plugins: [
  stylex.vite({
    useCSSLayers: true,
    dev: mode === 'development',
    runtimeInjection: false,
  }),
  react({ /* existing swc config */ }),
  // front: wyw(...) stays until phase 8
  // ui: sassDts(...) stays until phase 8
],
```

- `stylex.vite()` must sit before the React plugin to keep Fast Refresh.
- Both Storybooks inherit through `viteFinal`. Verify a StyleX story in light and dark in each.
- Layer order in `twenty-front/src/index.css` (see [Build architecture](#build-architecture)).
- Jest (front) and vitest (ui): add the StyleX transform. For front Jest, time `babel-jest` with `@stylexjs/babel-plugin` (`test: true`) against the community `@stylexswc/jest` on `modules/ui` and pick one. For ui vitest, the unplugin already in the Vite config covers it. Without a transform, `stylex.create` throws in tests.
- Lint: load `@stylexjs/eslint-plugin` through oxlint `jsPlugins`, which `.oxlintrc.json` already uses for `twenty-oxlint-rules`. If it doesn't run under oxlint, add a narrow ESLint run limited to the StyleX rules in `lint:diff-with-main`.
- **Spikes, decided before phase 3:**
  - Self attribute conditions for [Base UI state](#base-ui-state).
  - Merging an `xstyle` compiled in front into a component compiled in twenty-ui's `dist/`.
  - The layer names each build emits.
- `CLAUDE.md`: new styling is StyleX only. Linaria and SCSS only when editing a file that hasn't been converted yet.

**Done when** a StyleX component renders in the app, both Storybooks, a Jest test and a vitest test, and the spike outcomes are written in `docs/styling.md`.

## Phase 2: Tokens

**New** (generated by `twenty-ui/scripts/generateThemeTokens.ts` from the same design-token source as today):

```ts
// packages/twenty-ui/src/theme/tokens.stylex.ts
import * as stylex from '@stylexjs/stylex';

export const spacing = stylex.defineVars({
  '--t-spacing-0': '0px',
  '--t-spacing-1': '4px',
  // ...
});

export const fontColor = stylex.defineVars({
  '--t-font-color-primary': '#333333',
  // ...
});
```

```ts
// packages/twenty-ui/src/theme/themes.stylex.ts
export const darkTheme = [
  stylex.createTheme(spacing, { /* dark values */ }),
  stylex.createTheme(fontColor, { /* ... */ }),
  // one per group
];
```

```ts
// packages/twenty-ui/src/theme/constants.stylex.ts
export const media = stylex.defineConsts({
  mobile: '@media (max-width: 768px)',
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  print: '@media print',
  hoverCapable: '@media (hover: hover)',
  hoverCapableWithoutTouch: '@media (hover: hover) and (not (any-pointer: coarse))',
});
```

- `defineVars` takes a flat object, so each top-level token group (`spacing`, `fontColor`, `background`, `border`, ...) becomes its own export.
- Values match `theme-light.css` exactly, so StyleX's `:root` defaults and the existing `.light` class can coexist during the transition.
- Export the `.stylex.ts` modules from `twenty-ui/theme` (add them to the `exports` map) and verify that a front file importing them compiles.
- A unit test asserts that every key in `themeCssVariables` has a matching `defineVars` entry, so the two generated outputs can't drift.
- `ThemeProvider` keeps toggling `.light` / `.dark` until phase 8.

## Phase 3: twenty-ui primitives

`src/primitives/` and the shared mixins first, because everything else, and twenty-front, builds on them.

- Mixins become shared style objects or consts. `focus-ring` becomes `focusStyles.ring` in `styles/focus.stylex.ts` (a `stylex.create` exported for reuse is fine within a package). `hover-capable` becomes `media.hoverCapable`. `card-owner` becomes `cardOwnerStyles`.
- Component custom properties (`--tw-button-*`) become `Button.stylex.ts` `defineVars`. Parents such as `ButtonGroup` override them with `createTheme` (convention 9).
- `data-variant` / `data-size` / `data-color` become StyleX variants chosen from props. Drop the data attributes unless tests or e2e selectors use them; grep `twenty-e2e-testing` before deleting any.
- Base UI state attributes follow the phase 1 decision.
- Every primitive gains `xstyle` and keeps `className` until its last front caller is converted (tracked by grep, removed in phase 8).
- `@keyframes` (skeleton shimmer, progress bar and ring, loader dot, avatar pulse, toast countdown) become `stylex.keyframes`.

Acceptance per component: its Storybook stories pass the twenty-ui visual diff (`scripts/visual-diff.sh`) in light and dark.

## Phase 4: twenty-ui components

The rest of `src/components/`, `src/layout`, `src/navigation` and the code editor, same rules as phase 3.

- Monaco's `:global(.monaco-editor)` / `:global(.overflow-guard)` overrides go to `third-party-styles/monaco.css`. The editor wrapper's variants pick a wrapper class that the CSS file keys off with an attribute on the wrapper only.
- The `.hoverable-buttons` and `.grip-swap-*` hover hooks become markers (convention 8).
- `reset.scss` becomes a plain `reset.css` inside `@layer reset`. `styles/abstracts/*` is deleted once nothing `@use`s it.
- Inline `style={{...}}` (149): static ones move into `stylex.create`, continuous ones become dynamic styles, and library-computed ones stay (convention 5).

**Done when** twenty-ui has no `*.module.scss`, no `clsx` import, and builds without sass.

## Phase 5: Front codemod and pilot

**New**: `packages/twenty-utils/codemods/linaria-to-stylex/` (jscodeshift or ts-morph, plus `postcss` and `postcss-js` to turn CSS text into objects).

The codemod:

1. Converts `styled.tag\`...\`` and `css\`...\`` blocks that have no prop interpolation and no nested non-pseudo selector into `stylex.create` entries, and replaces `<StyledX>` with `<tag {...stylex.props(styles.x)}>`, keeping the other JSX props.
2. Maps `${themeCssVariables.spacing[4]}` to `spacing['--t-spacing-4']`, and `@media (max-width: ${MOBILE_VIEWPORT}px)` to `media.mobile`.
3. Turns `&:hover`, `&:focus-visible`, `&::before` into StyleX conditional values (`{ default: ..., ':hover': ... }`).
4. Expands shorthands to longhands.
5. Leaves a block alone and records it in a report (`file:line`, reason) when it has prop interpolations, nested selectors, `${StyledX}` references or `!important`. The report is the work list for phases 6 and 7.
6. Fails rather than guesses on anything it can't parse.

**Pilot**: `modules/settings` (201 files, the largest and least shared area). Run the codemod, hand-convert the report, and adjust the conventions where they don't hold up. Acceptance: Storybook visual diff on the settings stories.

## Phase 6: Front shared UI

`modules/ui` (152 files), because most `styled(Component)` wrappers and cross-module imports point into it.

- Exported components that get restyled from outside take `xstyle` and keep `className` until their last Linaria caller is gone.
- The 8 `styled(motion.div)` wrappers become `<motion.div {...stylex.props(styles.x)}>`. Animated values stay in Framer Motion's `animate` / `style`.
- The 6 files with `${StyledX}` component selectors move to markers.
- Third-party overrides move into `src/third-party-styles/*.css`.
- Go through all 49 `!important`. Most exist to beat twenty-ui or library CSS and go away with the declared layer order. The rest move into the third-party CSS files.
- Front callers that pass `className` to twenty-ui components switch to `xstyle`.

## Phase 7: Front feature modules

One ticket per module, split the big ones by subfolder, leaves before the modules that import them: `activities`, `ai`, `workflow`, `page-layout`, `side-panel`, `object-record`, then the small modules and `pages/`.

Per ticket:

1. Run the codemod on the folder.
2. Hand-convert the report. Enum-like props become variants, booleans become `cond && styles.x`, continuous values become dynamic styles. Nested selectors move to the child or a marker.
3. Convert static `style={{...}}` in the folder.
4. Delete the `styled.x<Props>` generics and transient props that only existed to reach CSS.
5. Typecheck, run single-file Jest on touched specs, `lint:diff-with-main`, and the Storybook visual diff on the module's stories.

The tickets are independent once phase 6 lands and can run in parallel worktrees.

## Phase 8: Remove the old systems

- `grep -r "@linaria\|module.scss\|clsx" packages/twenty-front/src packages/twenty-ui/src` returns nothing.
- Remove the dependencies `@linaria/core`, `@linaria/react`, `@wyw-in-js/vite`, `sass`, `sass-embedded`, `vite-plugin-sass-dts` and `clsx`. Remove the `wyw(...)` and `sassDts(...)` plugin blocks, the SCSS options in both Vite configs, `createWywProfilingPlugin` in `twenty-shared/vite`, and the ambient `*.module.scss` typings.
- Remove `className` from twenty-ui public components that no longer have a `className` caller.
- `ThemeProvider` applies `darkTheme` with `stylex.props` instead of toggling `.dark`. `color-scheme` stays in the global CSS keyed off `html.dark` / `html.light`, so keep setting that class, and keep it only for that. The generator stops emitting `theme-*.css` and `themeCssVariables.ts`, and the `exports` entries for `theme-light.css` / `theme-dark.css` go.
- Add the `no-restricted-imports` entries from convention 12.
- Update `CLAUDE.md` (the Linaria house rule) and remove the transition notes.
- Compare production CSS size, twenty-ui `dist/style.css` size and dev-server cold start against a baseline taken at the start of phase 1, and record them in the PR.

## Phase 9: Emails

`twenty-emails` has 13 shared components, 8 transactional templates and the TipTap JSON renderer (`utils/email-renderer/`) used for campaign emails. Templates style themselves through `style={titleStyle}` objects built from `canvasTheme` in `src/common-style.ts`. No tests cover the rendered HTML.

**First, a safety net.** Add one Jest snapshot test per template that renders it with `render()` (the existing `src/render.ts`) and snapshots the HTML. Commit the snapshots before any styling change. Every later diff in this phase has to show inline styles that are equivalent to the old ones.

**New**

```ts
// packages/twenty-emails/src/tailwind.config.ts
import { pixelBasedPreset, type TailwindConfig } from 'react-email';

export const EMAIL_TAILWIND_CONFIG: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        highlighted: '#333333',
        primary: '#666666',
        // ... every value in canvasTheme.font.colors and the background colours
      },
      fontFamily: { base: ['Trebuchet MS', 'sans-serif'] },
      fontSize: { /* canvasTheme.font.size */ },
    },
  },
};
```

**Modified**

```tsx
// packages/twenty-emails/src/components/BaseEmail.tsx
<Html lang={locale}>
  <Tailwind config={EMAIL_TAILWIND_CONFIG}>
    <BaseHead />
    <Container ...>
      ...
    </Container>
  </Tailwind>
</Html>
```

```tsx
// packages/twenty-emails/src/components/Title.tsx
<Heading as="h1" className="font-base text-xl font-bold text-highlighted">
  {value}
</Heading>
```

- `canvasTheme`'s values move into `EMAIL_TAILWIND_CONFIG` as theme tokens, so templates use `text-highlighted`, not `text-[#333333]`. Arbitrary values only for one-offs.
- `<Tailwind>` wraps `<Head>` directly, which react-email needs for responsive (`sm:`, `md:`) classes to land in a `<style>` block.
- `pixelBasedPreset` replaces Tailwind's `rem` units with pixels, because several email clients don't support `rem`.
- Utilities that need anything beyond a single class lookup don't inline (`space-*`, `divide-*`, `prose`, most `hover:`). Use per-element padding and margins instead.
- **The campaign renderer keeps inline styles for user-authored values.** `block-style.ts` and `inherited-typography.ts` turn the TipTap document's attributes into `style`, and campaign drafts carry their own `canvasTheme` from the editor (`twenty-server` `message-campaign-draft.service.ts`). Those values come from the user at render time, so building Tailwind class names from them would be fragile. Fixed structure in the renderer's node components (paddings, list layout, button shape) moves to Tailwind classes. Values from the document stay in `style`.
- Delete `common-style.ts` once nothing imports `canvasTheme` from it. The campaign theme type the server uses stays wherever it's defined.
- Send each template through Mailpit/Gmail/Outlook previews (`email dev` from `@react-email/ui`) before merging.
- Lint: the oxlint `twenty/no-hardcoded-colors` disable in `common-style.ts` goes with the file, and colours live only in the Tailwind config.

**Done when** no `twenty-emails` component has a static `style` object, the snapshot diff shows equivalent inline CSS, and the Go campaign tests (`twenty-server-go/internal/messaging/campaign_test.go`), which assert on rendered email, still pass.

## Risks

| Risk | Mitigation |
| --- | --- |
| Visual regressions across ~1,400 files | Storybook visual diff per ticket in both packages. The codemod refuses anything it can't convert mechanically |
| Base UI state attributes can't be expressed as self conditions | Phase 1 spike. The fallback (state callbacks) is fully specified |
| Cascade between twenty-ui's compiled CSS, front's and library CSS | One declared `@layer` order, checked in phase 1. Cross-package overrides go through `xstyle` so they merge at runtime |
| Duplicate atomic CSS from two compile units | Measured in phase 8. Compiling twenty-ui source in front is the documented fallback |
| `@stylexjs/eslint-plugin` doesn't run under oxlint `jsPlugins` | Narrow ESLint run for StyleX rules only |
| Jest transform slows the suite | Time both transforms in phase 1 |
| Three styling systems during the transition | New code is StyleX only from phase 1, in `CLAUDE.md` and review. Old systems get removed on a fixed endpoint (phase 8), not "eventually" |
| e2e selectors rely on `data-variant` / class names | Grep `twenty-e2e-testing` before dropping any attribute |
| Email rendering changes in clients the snapshots don't cover | HTML snapshots before the change, plus a manual preview in Gmail and Outlook per template |
| Upstream Twenty merges | Upstream is moving to SCSS, so every styling file pulled from upstream conflicts by hand from here on. Decide whether upstream syncs still matter for this fork before starting |

## Out of scope

- `useTheme()` JS values used for icon sizes and chart colours. These are runtime numbers handed to components, not CSS.
