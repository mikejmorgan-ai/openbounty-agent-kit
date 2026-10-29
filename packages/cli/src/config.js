/**
 * Configuration and API key resolution for the obk CLI.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function getDefaultConfigPath() {
  const home = os.homedir();
  return path.join(home, ".config", "openbounty", "config.json");
}

export function loadApiKey(customConfigPath = null) {
  // 1. Priority: environment variable
  if (process.env.OPENBOUNTY_API_KEY && process.env.OPENBOUNTY_API_KEY.trim()) {
    return process.env.OPENBOUNTY_API_KEY.trim();
  }

  // 2. Priority: ~/.config/openbounty/config.json
  const configPath = customConfigPath || getDefaultConfigPath();

  if (fs.existsSync(configPath)) {
    try {
      const stats = fs.statSync(configPath);
      // Mode mask 0o777: check that group and others have no read/write/execute permissions (mode & 0o077 === 0)
      const mode = stats.mode & 0o777;
      if ((mode & 0o077) !== 0) {
        throw new Error(
          `Insecure permissions on ${configPath} (mode: 0${mode.toString(8)}). Config file must be chmod 600 (readable/writable only by owner).`
        );
      }

      const content = fs.readFileSync(configPath, "utf8");
      const parsed = JSON.parse(content);
      const key = parsed.apiKey || parsed.api_key || parsed.token || parsed.key;

      if (key && typeof key === "string" && key.trim()) {
        return key.trim();
      }
      throw new Error(`No apiKey or token field found in ${configPath}`);
    } catch (err) {
      if (err.message.includes("Insecure permissions") || err.message.includes("No apiKey")) {
        throw err;
      }
      throw new Error(`Failed to read config file ${configPath}: ${err.message}`);
    }
  }

  throw new Error(
    "Missing API key. Set OPENBOUNTY_API_KEY environment variable or create ~/.config/openbounty/config.json (mode 600) with {\"apiKey\": \"ob_live_sk_...\"}."
  );
}
