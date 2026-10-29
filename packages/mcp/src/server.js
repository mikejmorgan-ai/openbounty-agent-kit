/**
 * JSON-RPC Model Context Protocol (MCP) stdio server implementation.
 */

import readline from "node:readline";
import { OpenBountyApi } from "./api.js";
import { TOOLS, createToolHandlers } from "./tools.js";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = {
  name: "openbounty-mcp",
  version: "0.1.0",
};

export async function handleRpcMessage(message, toolHandlers) {
  if (!message || typeof message !== "object") {
    return {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request: expected JSON object" },
    };
  }

  const { id, method, params } = message;

  // Notifications have no id and expect no response
  if (id === undefined || id === null) {
    if (method === "notifications/initialized" || method === "initialized") {
      return null;
    }
    return null;
  }

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: SERVER_INFO,
        },
      };

    case "ping":
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS,
        },
      };

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const handler = toolHandlers[toolName];

      if (!handler) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Tool not found: ${toolName}`,
          },
        };
      }

      try {
        const result = await handler(toolArgs);
        return {
          jsonrpc: "2.0",
          id,
          result,
        };
      } catch (err) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `Execution error: ${err.message || String(err)}` }],
            isError: true,
          },
        };
      }
    }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
  }
}

export function startServer(options = {}) {
  const api = new OpenBountyApi(options);
  const toolHandlers = createToolHandlers(api);

  const rl = readline.createInterface({
    input: options.input || process.stdin,
    output: options.output || process.stdout,
    terminal: false,
  });

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let message;
    try {
      message = JSON.parse(trimmed);
    } catch {
      const errResponse = {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      };
      (options.output || process.stdout).write(JSON.stringify(errResponse) + "\n");
      return;
    }

    const response = await handleRpcMessage(message, toolHandlers);
    if (response !== null) {
      (options.output || process.stdout).write(JSON.stringify(response) + "\n");
    }
  });

  return rl;
}
