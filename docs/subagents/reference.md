# Subagents Reference

Precedence and locations
- Project: `.codex/agents/*.md` (highest)
- CLI: `--agents '<json>'` (middle)
- User: `~/.codex/agents/*.md` (lowest)
- Duplicate names resolve by precedence (project > CLI > user).

`--agents` JSON schema
{
  "<name>": {
    "description": "...",
    "prompt": "...",
    "tools": ["Read", "Grep"],
    "model": "inherit" | "<alias>"
  }
}
- `tools` accepts a comma‑separated string or an array.

Tool aliases
- Bash → `unified_exec`
- Read → `read_file`
- Grep → `grep_files`
- Glob (List) → `list_dir`
- MCP tools use their fully qualified names as discovered.

Lifecycle events
- `SubagentStarted { name }`
- `SubagentStopped { name, success }`
  - Emitted when a subagent begins and ends.

Plugin agents (future)
- Plugin manifests can contribute agents from `agents/` directories.
- Codex will show plugin agents in `/agents` and allow invoking them like any other.

