# @helpscout/hsds-evals

Promptfoo-based evaluations for HSDS code generation, driven by the **Claude
Agent SDK** so each case runs through the same agent loop a developer would
get from Claude Code. The agent reads `packages/hsds/components/`, the
repo's `CLAUDE.md`, and any other source it needs — then returns the feature
as one fenced code block per file (component, hooks, types, …). The metrics
aggregate across every block.

## What it measures

Three named metrics per case, plus tokens/latency captured natively by promptfoo:

- **ComponentCoverage** — fraction of expected HSDS components the model actually used.
- **PropCoverage** — fraction of expected `(component, prop=value)` pairs that appear in the output.
- **CustomCssLines** — penalty for styled-components / `css` template literals / inline `style={}`. Score = `max(0, 1 - lines/20)`.

## What the agent sees

- **working_dir** = repo root (resolved from `promptfooconfig.yaml`).
- **Tools**: read-only by default (`Read`, `Grep`, `Glob`, `LS`) plus `Bash` for `find` / `wc` / etc. No `Write` or `Edit`.
- **`setting_sources: ['project']`** — picks up the repo's `CLAUDE.md` and `.claude/` commands.
- **`permission_mode: dontAsk`** — non-interactive: anything outside the allow-list is denied silently.
- Default Claude Code system prompt + an appended HSDS section (see `promptfooconfig.yaml`).

This is the closest faithful simulation of an engineer typing the task into Claude Code in this repo.

## Setup

```bash
# From repo root — picks up the new workspace and installs promptfoo + the agent SDK
npm install

# Anthropic API key — copy .env.example to .env and fill in.
# Promptfoo auto-loads .env from the workspace dir via dotenv.
cp packages/hsds-evals/.env.example packages/hsds-evals/.env
$EDITOR packages/hsds-evals/.env
```

(Alternatively: `export ANTHROPIC_API_KEY=...` in your shell.)

## Run

```bash
npm run eval -w @helpscout/hsds-evals       # run all cases
npm run eval:view -w @helpscout/hsds-evals  # open the web UI
```

Add `-- --filter-description "permissions"` to limit which cases run.

**Cost note:** the Agent SDK runs multi-turn loops with tool use. Expect
each case to consume considerably more tokens than a direct Messages-API
call (it'll often read several HSDS component files before answering).
Keep cases focused and use `--filter-description` while iterating.

## Adding a case

Drop a YAML file under `cases/`:

```yaml
description: <one-line title>
vars:
  task: >
    <natural-language prompt the model receives — exactly what you would
    type into Claude Code>
metadata:
  expectedComponents:
    - name: Alert
      props:
        state: success
    - name: Button
```

`expectedComponents[].name` is the PascalCase JSX tag (`Alert`, not `alert`).
`props` is optional and component-scoped. A `Table` expectation is satisfied
by any sub-component usage (`<Table.Body>` counts).

## Changing the provider / model

Edit `promptfooconfig.yaml`. The `model` field accepts any Claude model id
(`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`) or alias
(`sonnet`, `opus`, `haiku`). Duplicate the provider block to compare tiers
side-by-side — promptfoo produces one column per provider.

## v1 limitations (regex-based extraction)

- Renamed imports (`import { Alert as Banner }`) won't be detected. The appended system prompt forbids aliasing.
- Spread props (`<Alert {...props} />`) miss prop coverage.
- Dynamic prop values (`state={isOk ? 'success' : 'error'}`) won't string-match.
- The custom-CSS-lines counter counts lines, not CSS rules.

Not in v1: AST parsing, type-checking generated code, llm-rubric grading, icon coverage, CI integration.
