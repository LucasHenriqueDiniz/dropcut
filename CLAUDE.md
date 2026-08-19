# CLAUDE.md

Project instructions for Claude Code and other coding agents (OpenCode, Aider, etc.).

## Read first

Before editing this project, read these docs:

1. `docs/RUST_FOR_TAURI.md`
2. `docs/TAURI_V2.md`

Treat those files as project rules unless a newer local project file contradicts them.

This is a Tauri v2 desktop app with a web frontend and a Rust backend.

---

## Core rule

Use the frontend for UI. Use Rust for native/system-sensitive logic.

Frontend should handle:

- layout;
- components;
- forms;
- loading/error UI;
- local UI state;
- calling typed Tauri wrappers.

Rust should handle:

- filesystem;
- path validation;
- sidecars/processes;
- long-running tasks;
- business-sensitive validation;
- local config persistence;
- OS integration;
- plugin integration.

Do not put dangerous or system-level behavior directly in frontend code.

---

## Before coding

Inspect the existing project first:

- `package.json`
- lockfile: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or `bun.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/`
- existing frontend structure under `src/`
- existing Rust modules under `src-tauri/src/`

Do not assume the package manager. Use the lockfile and existing scripts.

---

## Implementation style

Make the smallest coherent change.

Do not rewrite large parts of the project unless explicitly requested.

Prefer:

- explicit code;
- typed inputs/outputs;
- small commands;
- services for business logic;
- clear error handling;
- minimal permissions;
- simple UX.

Avoid:

- overengineering;
- huge abstractions;
- hidden global state;
- broad filesystem permissions;
- generic shell runners;
- adding dependencies without justification;
- changing project structure unnecessarily.

---

## Tauri command rules

When adding frontend → Rust behavior:

1. create typed Rust input/output structs;
2. expose a small `#[tauri::command]`;
3. put real logic in `services/`;
4. return `Result<Output, AppError>`;
5. register command in `invoke_handler`;
6. create/update a typed TypeScript wrapper;
7. call the wrapper from UI.

Rust command names should be `snake_case`.

TypeScript wrappers should be `camelCase`.

Use `serde(rename_all = "camelCase")` for structs crossing the frontend/Rust boundary.

---

## Rust rules

Follow `docs/RUST_FOR_TAURI.md`.

Required behavior:

- no `unwrap()` in normal user-facing flow;
- validate all frontend input;
- use `AppError` or the existing project error type;
- keep `commands/` thin;
- keep logic in `services/`;
- prefer explicit arguments over command strings;
- avoid shell execution unless necessary;
- use async/events for long-running tasks;
- add tests for pure validation/service logic when reasonable.

Before finishing Rust changes, run:

```bash
cd src-tauri
cargo fmt
cargo check
cargo clippy
```

If logic changed and tests exist or are easy to add:

```bash
cargo test
```

---

## Tauri rules

Follow `docs/TAURI_V2.md`.

Required behavior:

- use Tauri v2 APIs and docs, not Tauri v1 patterns;
- keep capabilities minimal;
- document any new permission;
- do not add plugins without concrete need;
- do not loosen CSP/security settings casually;
- use events for progress from long tasks;
- centralize frontend Tauri calls in a wrapper file when possible.

Before changing permissions, inspect:

```txt
src-tauri/capabilities/
```

Before changing app config, inspect:

```txt
src-tauri/tauri.conf.json
```

---

## Frontend rules

Use the existing frontend stack and style.

Before adding UI code:

- inspect existing components;
- inspect styling approach;
- inspect state management;
- inspect naming conventions.

Do not introduce a new UI library unless explicitly requested.

When calling Rust:

- use a typed wrapper;
- show loading state;
- catch errors;
- display a useful message;
- prevent duplicate submissions when dangerous.

---

## Dependency rules

Before adding any dependency:

1. check if existing code already has a utility;
2. check if standard library/Tauri already solves it;
3. prefer small maintained packages/crates;
4. explain why it is needed in the final summary.

Do not add heavy dependencies for simple helpers.

---

## Release rules

This project publishes Windows builds through GitHub Actions.

Use `.github/workflows/release.yml` for releases instead of relying on a local `gh` installation.

Release flow:

1. commit and push the code for the release;
2. ensure the `Release` workflow already exists on `master` before creating a new tag;
3. create and push a version tag like `v0.1.0`;
4. GitHub Actions builds the Tauri app on Windows and creates/uploads the GitHub Release assets.

Important:

- GitHub does not run a newly added workflow retroactively for tags that were pushed before the workflow existed.
- If a tag already exists, run the `Release` workflow manually from GitHub Actions using `workflow_dispatch` and the existing tag.
- Do not delete, move, or force-update release tags unless the user explicitly requests it.
- The release workflow depends on Git LFS assets, so keep `git lfs pull` in the workflow.
- Current builds are not code-signed; release notes should mention the possible Windows SmartScreen warning.

---

## File and process safety

Never implement generic user-controlled shell execution.

Bad:

```rust
Command::new("cmd").args(["/C", user_input]).spawn();
```

Better:

```rust
Command::new(tool_path)
    .arg("-i")
    .arg(input_path)
    .arg(output_path)
    .spawn();
```

Always validate paths before IO.

For file operations:

- check existence;
- check file vs directory;
- validate extension/type where relevant;
- canonicalize where useful;
- avoid overwriting unless explicitly requested;
- use safe temp files for intermediate output.

---

## Long task UX

For tasks like compression, conversion, scanning, import/export, or download:

- Rust command should be async;
- task should not freeze UI;
- emit progress events when useful;
- frontend should show progress;
- errors should be surfaced clearly;
- cancellation should be considered if the task can take long.

---

## Completion checklist

Before final answer, summarize:

- changed files;
- reason for each change;
- commands run;
- commands not run and why;
- risks or follow-up if any.

Run relevant checks:

Frontend:

```bash
npm run lint
npm run typecheck
npm run build
```

or project-equivalent commands from `package.json`.

Rust:

```bash
cd src-tauri
cargo fmt
cargo check
cargo clippy
```

Do not claim a command passed unless it was actually run.

---

## Default response format

When finished, respond with:

```txt
Changed:
- file: what changed

Checks:
- command: result

Notes:
- any risk, limitation, or next step
```

Keep it short and concrete.
