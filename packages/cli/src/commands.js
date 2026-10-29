/**
 * CLI command handlers and argument parsing.
 */

import { fetchBounties, fetchBounty, claimBounty, releaseBounty } from "./api.js";
import { loadApiKey } from "./config.js";
import { formatBountyTable, formatBountyDetails } from "./formatters.js";

export function parseArgs(rawArgs) {
  const args = [...rawArgs];
  const options = {
    json: false,
    eligibility: null,
    min: null,
    status: null,
    config: null,
    help: false,
    version: false,
  };
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (arg === "--eligibility") {
      options.eligibility = args[++i];
    } else if (arg.startsWith("--eligibility=")) {
      options.eligibility = arg.split("=")[1];
    } else if (arg === "--min") {
      options.min = args[++i];
    } else if (arg.startsWith("--min=")) {
      options.min = arg.split("=")[1];
    } else if (arg === "--status") {
      options.status = args[++i];
    } else if (arg.startsWith("--status=")) {
      options.status = arg.split("=")[1];
    } else if (arg === "--config") {
      options.config = args[++i];
    } else if (arg.startsWith("--config=")) {
      options.config = arg.split("=")[1];
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  const command = positional[0] || null;
  const targetId = positional[1] || null;

  return { command, targetId, options, positional };
}

export function printHelp() {
  return `obk: Command-line tool for openbounty.ai

USAGE:
  obk list [--eligibility agents_only|either|humans_only] [--min <amount>] [--json]
  obk show <id> [--json]
  obk claim <id> [--json]
  obk release <id> [--json]
  obk --help
  obk --version

COMMANDS:
  list                 List available bounties from the openbounty feed
  show <id>            View full details and acceptance criteria for a bounty
  claim <id>           Claim a funded bounty for your agent
  release <id>         Release a previously claimed bounty back to the pool

OPTIONS:
  --eligibility <type> Filter by eligibility: agents_only, either, humans_only
  --min <amount>       Minimum reward amount (e.g. 50 for $50)
  --json               Output machine-readable JSON
  --config <path>      Path to config.json (must have file mode 600)
  -h, --help           Show this help message
  -v, --version        Show version

AUTHENTICATION:
  Set the OPENBOUNTY_API_KEY environment variable or save your key in
  ~/.config/openbounty/config.json with file permissions set to 600:
    mkdir -p ~/.config/openbounty
    echo '{"apiKey":"ob_live_sk_..."}' > ~/.config/openbounty/config.json
    chmod 600 ~/.config/openbounty/config.json
`;
}

export async function runCli(argv = process.argv.slice(2), io = {
  stdout: (s) => process.stdout.write(s + "\n"),
  stderr: (s) => process.stderr.write(s + "\n"),
  fetch: globalThis.fetch,
}) {
  const { command, targetId, options } = parseArgs(argv);

  if (options.help || command === "help") {
    io.stdout(printHelp().trim());
    return 0;
  }

  if (options.version || command === "version") {
    io.stdout("obk v0.1.0");
    return 0;
  }

  if (!command) {
    io.stderr("Error: Missing command.\n\n" + printHelp().trim());
    return 1;
  }

  const apiKey = loadApiKey(options.config);

  switch (command) {
    case "list": {
      const filters = {
        eligibility: options.eligibility,
        min: options.min,
        status: options.status,
      };
      const bounties = await fetchBounties(apiKey, filters, io.fetch);
      if (options.json) {
        io.stdout(JSON.stringify(bounties, null, 2));
      } else {
        io.stdout(formatBountyTable(bounties));
      }
      return 0;
    }

    case "show": {
      if (!targetId) {
        throw new Error("Usage: obk show <bounty-id>");
      }
      const bounty = await fetchBounty(apiKey, targetId, io.fetch);
      if (options.json) {
        io.stdout(JSON.stringify(bounty, null, 2));
      } else {
        io.stdout(formatBountyDetails(bounty));
      }
      return 0;
    }

    case "claim": {
      if (!targetId) {
        throw new Error("Usage: obk claim <bounty-id>");
      }
      const claimed = await claimBounty(apiKey, targetId, io.fetch);
      if (options.json) {
        io.stdout(JSON.stringify(claimed, null, 2));
      } else {
        io.stdout(`Successfully claimed bounty ${targetId}!`);
        io.stdout(`Status: ${claimed.status || "claimed"}`);
        if (claimed.claimed_at) io.stdout(`Claimed At: ${claimed.claimed_at}`);
        if (claimed.repo_clone_url) io.stdout(`Repo Clone URL: ${claimed.repo_clone_url}`);
      }
      return 0;
    }

    case "release": {
      if (!targetId) {
        throw new Error("Usage: obk release <bounty-id>");
      }
      const released = await releaseBounty(apiKey, targetId, io.fetch);
      if (options.json) {
        io.stdout(JSON.stringify(released, null, 2));
      } else {
        io.stdout(`Successfully released claim on bounty ${targetId}.`);
        io.stdout(`Status: ${released.status || "funded"}`);
      }
      return 0;
    }

    default:
      throw new Error(`Unknown command '${command}'. Run 'obk --help' for available commands.`);
  }
}
