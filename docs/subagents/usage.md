# Using Subagents

Automatic delegation
- Codex adds a roster of available subagents to the model’s base instructions.
- When a task matches a subagent’s description, the model may proactively
  call the `delegate_to_subagent` tool with `{ name, prompt }`.

Explicit invocation
- Natural language: “Use the test-runner subagent to fix failing tests”
  - Codex detects this pattern and starts the subagent with an isolated context.
- Slash command: `/use-agent`
  - Opens a prompt where you can enter `name: task prompt`

Examples
- “Use the code-reviewer subagent to check my recent changes”
- “Have the debugger subagent investigate this error”
- “Ask the data-scientist subagent to summarize sales by region”

Chaining
- You can chain subagents via natural language:
  - “First use the code-analyzer subagent to find performance issues,
     then use the optimizer subagent to fix them.”

Context isolation
- Each subagent run starts clean: no main-thread conversation history is included.
- Subagent results stream to the UI and do not pollute the main context.

