import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import os from "node:os";

export interface CodexConfigData {
  apiKey?: string;
  profile?: string;
  updatedAt?: string;
}

export class ConfigManager {
  readonly path: string;

  constructor(configPath?: string) {
    const defaultPath = resolve(os.homedir(), ".codex", "config.json");
    this.path = configPath ? resolve(configPath) : defaultPath;
  }

  async load(): Promise<CodexConfigData> {
    try {
      const raw = await fs.readFile(this.path, "utf8");
      const data = JSON.parse(raw) as CodexConfigData;
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw error;
    }
  }

  async save(data: CodexConfigData): Promise<void> {
    const dir = dirname(this.path);
    await fs.mkdir(dir, { recursive: true });
    const normalized: CodexConfigData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.path, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  }

  async delete(): Promise<void> {
    try {
      await fs.unlink(this.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
}
