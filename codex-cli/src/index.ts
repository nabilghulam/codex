#!/usr/bin/env bun
import { runCli } from "./cli";

const args = process.argv.slice(2);

runCli(args)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
