import { ConfigManager, CodexConfigData } from "./config";
import { runExec } from "./exec";
import { version } from "../package.json" assert { type: "json" };

interface GlobalOptions {
  configPath?: string;
  showHelp: boolean;
  showVersion: boolean;
  rest: string[];
}

interface LoginOptions {
  apiKey?: string;
  readFromStdin: boolean;
  profile?: string;
}

interface ExecCliOptions {
  cwd?: string;
  dryRun: boolean;
  env: Record<string, string>;
  command: string;
  args: string[];
}

const HELP_TEXT = `Usage: codex [command] [options]\n\n` +
  `Commands:\n` +
  `  login [--api-key <value>] [--stdin] [--profile <name>]  Save credentials locally\n` +
  `  logout                                              Remove stored credentials\n` +
  `  status                                              Display current configuration\n` +
  `  exec [options] <command> [args...]                  Run a shell command using Codex tooling\n` +
  `  help                                                Show this help message\n\n` +
  `Global options:\n` +
  `  -h, --help             Show help\n` +
  `  -V, --version          Show version\n` +
  `  --config <path>        Use a specific config file\n` +
  `\nExamples:\n` +
  `  codex login --stdin < token.txt\n` +
  `  codex exec --cwd ./my-app --env NODE_ENV=development npm test\n` +
  `  codex status\n`;

function parseGlobalOptions(argv: string[]): GlobalOptions {
  const rest = [...argv];
  let showHelp = false;
  let showVersion = false;
  let configPath: string | undefined;

  while (rest.length > 0) {
    const token = rest[0];
    if (token === "-h" || token === "--help") {
      showHelp = true;
      rest.shift();
      continue;
    }
    if (token === "-V" || token === "--version") {
      showVersion = true;
      rest.shift();
      continue;
    }
    if (token === "--config") {
      rest.shift();
      const value = rest.shift();
      if (!value) {
        throw new Error("Missing value for --config");
      }
      configPath = value;
      continue;
    }
    break;
  }

  return {
    configPath,
    showHelp,
    showVersion,
    rest,
  };
}

function parseLoginArgs(args: string[]): LoginOptions {
  const options: LoginOptions = {
    readFromStdin: false,
  };

  const rest = [...args];
  while (rest.length > 0) {
    const token = rest.shift()!;
    switch (token) {
      case "--stdin": {
        options.readFromStdin = true;
        break;
      }
      case "--api-key": {
        const value = rest.shift();
        if (!value) {
          throw new Error("Missing value for --api-key");
        }
        options.apiKey = value;
        break;
      }
      case "--profile": {
        const value = rest.shift();
        if (!value) {
          throw new Error("Missing value for --profile");
        }
        options.profile = value;
        break;
      }
      default: {
        throw new Error(`Unknown login option: ${token}`);
      }
    }
  }

  return options;
}

function mask(value: string | undefined): string {
  if (!value) {
    return "(not set)";
  }
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }
  const visible = value.slice(-4);
  return `${"*".repeat(value.length - 4)}${visible}`;
}

function parseExecArgs(args: string[]): ExecCliOptions {
  const rest = [...args];
  const env: Record<string, string> = {};
  let cwd: string | undefined;
  let dryRun = false;

  while (rest.length > 0) {
    const token = rest[0];
    if (token === "--dry-run") {
      dryRun = true;
      rest.shift();
      continue;
    }
    if (token === "--cwd") {
      rest.shift();
      const value = rest.shift();
      if (!value) {
        throw new Error("Missing value for --cwd");
      }
      cwd = value;
      continue;
    }
    if (token === "--env") {
      rest.shift();
      const pair = rest.shift();
      if (!pair) {
        throw new Error("Missing value for --env");
      }
      const equalsIndex = pair.indexOf("=");
      if (equalsIndex === -1) {
        throw new Error("--env expects KEY=VALUE");
      }
      const key = pair.slice(0, equalsIndex);
      const value = pair.slice(equalsIndex + 1);
      env[key] = value;
      continue;
    }
    if (token === "--") {
      rest.shift();
      break;
    }
    if (token.startsWith("--")) {
      throw new Error(`Unknown exec option: ${token}`);
    }
    break;
  }

  if (rest.length === 0) {
    throw new Error("exec requires a command to run");
  }

  const [command, ...commandArgs] = rest;

  return {
    cwd,
    dryRun,
    env,
    command,
    args: commandArgs,
  };
}

async function runLogin(
  manager: ConfigManager,
  options: LoginOptions
): Promise<number> {
  let apiKey = options.apiKey;
  if (!apiKey && options.readFromStdin) {
    apiKey = (await readFromStdin()).trim();
  }
  if (!apiKey) {
    process.stderr.write(
      "Login requires either --api-key or --stdin to provide credentials.\n"
    );
    return 1;
  }

  const previous = await manager.load();
  const next: CodexConfigData = {
    ...previous,
    apiKey,
    profile: options.profile ?? previous.profile,
  };

  await manager.save(next);
  process.stdout.write(`Saved credentials to ${manager.path}\n`);
  return 0;
}

async function runLogout(manager: ConfigManager): Promise<number> {
  await manager.delete();
  process.stdout.write("Removed stored credentials.\n");
  return 0;
}

async function runStatus(manager: ConfigManager): Promise<number> {
  const data = await manager.load();
  process.stdout.write("Codex CLI configuration:\n");
  process.stdout.write(`  Config file: ${manager.path}\n`);
  process.stdout.write(`  API key: ${mask(data.apiKey)}\n`);
  process.stdout.write(`  Profile: ${data.profile ?? "(default)"}\n`);
  process.stdout.write(
    `  Updated: ${data.updatedAt ? new Date(data.updatedAt).toISOString() : "never"}\n`
  );
  return 0;
}

async function runExecCommand(options: ExecCliOptions): Promise<number> {
  const result = await runExec(
    { command: options.command, args: options.args },
    { cwd: options.cwd, dryRun: options.dryRun, env: options.env }
  );

  if (result.signal) {
    process.stderr.write(`Command terminated by signal ${result.signal}.\n`);
    return 1;
  }

  return result.code ?? 1;
}

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function runCli(argv: string[]): Promise<number> {
  let globalOptions: GlobalOptions;
  try {
    globalOptions = parseGlobalOptions(argv);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    process.stderr.write("\n");
    process.stderr.write(HELP_TEXT);
    return 1;
  }

  if (globalOptions.showVersion) {
    process.stdout.write(`codex ${version}\n`);
    return 0;
  }

  if (globalOptions.showHelp || globalOptions.rest.length === 0) {
    process.stdout.write(`${HELP_TEXT}\n`);
    return 0;
  }

  const [command, ...rest] = globalOptions.rest;
  const manager = new ConfigManager(globalOptions.configPath);

  try {
    switch (command) {
      case "login": {
        const options = parseLoginArgs(rest);
        return await runLogin(manager, options);
      }
      case "logout": {
        return await runLogout(manager);
      }
      case "status": {
        return await runStatus(manager);
      }
      case "exec": {
        const options = parseExecArgs(rest);
        return await runExecCommand(options);
      }
      case "help": {
        process.stdout.write(`${HELP_TEXT}\n`);
        return 0;
      }
      default: {
        process.stderr.write(`Unknown command: ${command}\n`);
        process.stderr.write("\n");
        process.stderr.write(HELP_TEXT);
        return 1;
      }
    }
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 1;
  }
}
