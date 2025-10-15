use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Deserialize, Default)]
struct Frontmatter {
    pub name: Option<String>,
    pub description: Option<String>,
    pub model: Option<String>,
    pub color: Option<String>,
    /// Optional comma-separated list of tools. If omitted, agent inherits all tools.
    pub tools: Option<String>,
}

#[derive(Debug, Clone)]
pub(crate) struct AgentDef {
    pub name: String,
    pub description: String,
    pub prompt: String,
    pub model: Option<String>,
    pub tools: Option<Vec<String>>, // None => inherit
    pub source_path: PathBuf,
}

/// Discover agent definitions in `.codex/agents/*.md` under `cwd`.
pub(crate) fn discover_agents(cwd: &Path) -> Vec<AgentDef> {
    let dir = cwd.join(".codex").join("agents");
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };
    let mut agents = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("md") {
            continue;
        }
        if let Some(agent) = parse_agent_file(&path) {
            agents.push(agent);
        }
    }
    agents
}

/// Discover agent definitions in `~/.codex/agents/*.md`.
pub(crate) fn discover_user_agents() -> Vec<AgentDef> {
    let Some(home) = dirs::home_dir() else { return Vec::new(); };
    let dir = home.join(".codex").join("agents");
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };
    let mut agents = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("md") {
            continue;
        }
        if let Some(agent) = parse_agent_file(&path) {
            agents.push(agent);
        }
    }
    agents
}

fn parse_agent_file(path: &Path) -> Option<AgentDef> {
    let text = fs::read_to_string(path).ok()?;
    let text = text.trim();
    if !text.starts_with("---\n") {
        return None;
    }
    // Find closing frontmatter delimiter
    let rest = &text[4..];
    let end = rest.find("\n---\n").or_else(|| rest.find("\n---\r\n"))?;
    let (yaml, body_with_sep) = rest.split_at(end);
    let body = body_with_sep.trim_start_matches('\n').trim_start_matches("---").trim();

    let fm: Frontmatter = match serde_yaml::from_str(yaml) {
        Ok(fm) => fm,
        Err(_) => return None,
    };
    let name = fm.name.unwrap_or_default();
    let desc = fm.description.unwrap_or_default();
    if name.is_empty() || desc.is_empty() {
        return None;
    }
    let prompt = body.to_string();
    let tools = fm.tools.as_ref().map(|s| {
        s.split(',')
            .map(|t| t.trim().to_string())
            .filter(|t| !t.is_empty())
            .collect::<Vec<_>>()
    });
    Some(AgentDef {
        name,
        description: desc,
        prompt,
        model: fm.model,
        tools,
        source_path: path.to_path_buf(),
    })
}
