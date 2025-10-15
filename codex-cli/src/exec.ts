import { spawn } from "node:child_process";
import { resolve } from "node:path";

export interface ExecOptions {
  cwd?: string;
  dryRun?: boolean;
  env?: Record<string, string>;
}

export interface ExecCommand {
  command: string;
  args: string[];
}

export interface ExecResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export async function runExec(
  cmd: ExecCommand,
  options: ExecOptions = {}
): Promise<ExecResult> {
  const cwd = options.cwd ? resolve(options.cwd) : undefined;
  const env = {
    ...process.env,
    ...(options.env ?? {}),
  };

  if (options.dryRun) {
    process.stdout.write(`Would run: ${[cmd.command, ...cmd.args].join(" ")}\n`);
    if (cwd) {
      process.stdout.write(`  in ${cwd}\n`);
    }
    if (options.env && Object.keys(options.env).length > 0) {
      const entries = Object.entries(options.env)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ");
      process.stdout.write(`  with env: ${entries}\n`);
    }
    return { code: 0, signal: null };
  }

  const child = spawn(cmd.command, cmd.args, {
    cwd,
    env,
    stdio: "inherit",
  });

  const result: ExecResult = await new Promise((resolvePromise) => {
    child.on("exit", (code, signal) => {
      resolvePromise({ code, signal });
    });
    child.on("error", (error) => {
      process.stderr.write(`${error}\n`);
      resolvePromise({ code: 1, signal: null });
    });
  });

  return result;
}
