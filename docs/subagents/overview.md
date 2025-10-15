# Subagents (Codex)

Subagents are specialized AI assistants you can create and invoke for task‑specific workflows. Each subagent has its own system prompt, optional model override, and an optional tool allowlist. Subagents run in an isolated context window so your main conversation remains clean and focused.

Key capabilities
- Separate context per subagent (no main history leakage)
- Custom system prompt (Markdown body)
- Optional model override or `inherit`
- Optional tool allowlist (else inherits all tools, including MCP)
- Automatic and explicit invocation

Where definitions live
- Project: `.codex/agents/*.md` (highest precedence)
- CLI session: `--agents '<json>'` (middle precedence)
- User: `~/.codex/agents/*.md` (lowest precedence)

File format (Markdown with YAML frontmatter)
---
name: code-reviewer
description: Expert code review specialist. Proactively reviews code after changes.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are a senior code reviewer. Focus on code quality, security, and maintainability.

Model selection
- `model: inherit` uses the main session model
- `model: <alias>` selects a specific model (e.g., `gpt-5-codex`)
- Omit `model` to use Codex’s default subagent model (inherits by default)

Tools
- Omit `tools` to inherit all tools available to the main thread (incl. MCP)
- Specify comma‑separated tools to restrict access. Aliases are supported:
  - Bash → `unified_exec`
  - Read → `read_file`
  - Grep → `grep_files`
  - Glob → `list_dir`

