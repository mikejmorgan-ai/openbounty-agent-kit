#!/usr/bin/env node

/**
 * obk: Terminal CLI for openbounty.ai
 */

import { runCli } from "../src/commands.js";

runCli(process.argv.slice(2)).catch((err) => {
  console.error(`Error: ${err.message || String(err)}`);
  process.exit(1);
});
