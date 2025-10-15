# Repository Guidelines

## Project Structure & Module Organization
- `codex-rs/` is the Rust workspace that powers the CLI; each crate is prefixed `codex-*`, with shared tooling in `core_test_support`.
- `codex-cli/` packages the distributable Node.js launcher, while `sdk/typescript/` exposes automation hooks for downstream tooling.
- Long-form documentation lives in `docs/`, release helpers in `scripts/`, and tests sit next to the code they cover (snapshot assets under each crate’s `tests/` directory).

## Build, Test, and Development Commands
- Run `pnpm install` at the repo root for shared utilities, then rely on `cargo`, `just`, and `cargo-insta` inside `codex-rs/`.
- Format Rust changes with `just fmt`, lint with `just fix -p <crate>`, and validate with `cargo test -p <crate>`; escalate to `cargo test --all-features` when editing shared crates or protocols.
- For the CLI wrapper, `pnpm run dev` starts the local binary, `pnpm run format` checks Markdown/JSON/JS, and `pnpm run format:fix` applies Prettier.
- Release automation scripts (`codex-rs/scripts/create_github_release.sh`) are reserved for maintainers—coordinate before running them.

## Coding Style & Naming Conventions
- Follow `rustfmt` defaults (4-space indent, trailing commas) and keep `format!` arguments inlined; collapse nested `if` blocks to satisfy Clippy.
- JavaScript/TypeScript code uses ECMAScript modules and Prettier formatting; prefer kebab-case filenames (`vendor/cache-fetch.js`) and avoid mixing CommonJS.
- Documentation and configs should stay concise, with descriptive names (`docs/authentication.md`) and clear section headings mirroring user workflows.

## Testing Guidelines
- Prefer whole-object assertions and `pretty_assertions::assert_eq` for Rust diffs; organise tests under `mod tests` near the code under test.
- Manage snapshots with `cargo test -p codex-tui`, inspect via `cargo insta pending-snapshots -p codex-tui`, and accept intentional changes using `cargo insta accept -p codex-tui`.
- Record any manual CLI validation (e.g., `codex exec ./scripts/demo`) in the PR description when adding workflow changes.

## Commit & Pull Request Guidelines
- Follow the observed pattern `type(scope): summary (#PR)`—see `feat: make shortcut works even with capslock (#5049)`—and close issues with `fixes #NNN` when applicable.
- Verify `just fmt`, `just fix -p`, targeted `cargo test`, and `pnpm run format` before pushing; include command output when reviewers may benefit from it.
- Complete the PR template with What/Why/How, link design discussions, attach UI screenshots when the TUI changes, and call out config migrations explicitly.
- Sign the CLA by commenting `I have read the CLA Document and I hereby sign the CLA` on your first PR, and keep commits minimal so each passes checks independently.
