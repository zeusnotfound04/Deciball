# Lint: ESLint 9 flat config via eslint-config-next; ESLint 10 is blocked

**Decision (2026-09-17):** `apps/web` lints with `eslint .` on `eslint.config.mjs` (flat config) and `eslint@^9`.
`next lint` no longer exists in Next 16.

**Why not ESLint 10:** `eslint-config-next@16` depends on `eslint-plugin-import`, whose peer range stops at `^9`; on 10 the
linter crashes inside `runRules`. ESLint 9 is EOL upstream but is what Next's config targets. Bump when
`eslint-config-next` drops or upgrades `eslint-plugin-import`.

**State of the board:** 0 React Compiler (`react-hooks/*`) errors — keep it that way; the compiler is not await-aware, so
mount-time fetches go through `@tanstack/react-query`, and prop→state sync uses the adjust-state-during-render pattern,
not `useEffect` + `setState`. Remaining lint errors are all `@typescript-eslint/no-explicit-any` (140) — pre-existing debt.
