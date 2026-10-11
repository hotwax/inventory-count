import 'dotenv/config';
import fs from 'fs';
import path from 'path';

function getClientsEnvString() {
  // Read .env manually because dotenv truncates multiline strings without double quotes
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/CLIENTS='?(\{[\s\S]*\})'?/);
      if (match) {
        return match[1]; // The raw JSON string
      }
    }
  } catch (e) {
    // Ignore and fallback to process.env
  }
  return process.env.CLIENTS;
}

/**
 * Dynamic Client Manager for Cycle Count
 *
 * This module discovers and configures clients from environment variables.
 * Automatically generates HotWax Cycle Count URLs based on the Client ID, or reads overrides.
 */

/**
 * Constructs a standard HotWax Cycle Count URL if not explicitly provided
 */
const resolveUrl = (clientId: string, customUrl?: string) => {
  if (customUrl) return customUrl;

  // Use base URL from env if specified
  if (process.env.PLAYWRIGHT_BASE_URL) {
    return process.env.PLAYWRIGHT_BASE_URL;
  }
  
  if (process.env.PLAYWRIGHT_CYCLECOUNT_APP_URL) {
    return process.env.PLAYWRIGHT_CYCLECOUNT_APP_URL;
  }
  
  return "https://inventorycount-dev.hotwax.io";
};

/**
 * Retrieves a configuration for a single client
 */
const getClientConfig = (clientId) => {
  if (!clientId) throw new Error("clientId is required.");

  let config = { clientId };

  // Tier 1: Global CLI Overrides (Highest Priority)
  const baseUrl = process.env.URL || process.env.PLAYWRIGHT_BASE_URL;
  const username = process.env.USERNAME || process.env.PW_USERNAME;
  const password = process.env.PASSWORD || process.env.PW_PASSWORD;

  // If ANY of these are provided via CLI/Flat Env, use them and fill gaps from JSON
  if (baseUrl || username || password) {
    config = {
      ...config,
      baseUrl: resolveUrl(clientId, baseUrl),
      username: username,
      password: password,
    };
  }

  // Tier 3: Fallback to Structured JSON for missing fields
  const clientsStr = getClientsEnvString();
  if (clientsStr) {
    try {
      // Robustly extract JSON object from the string, ignoring leading/trailing quotes or newlines
      const match = clientsStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found in CLIENTS env var");
      
      const rawJson = match[0];
      const clientsMap = JSON.parse(rawJson);
      const clientData = clientsMap[clientId] || {};

      return {
        clientId,
        username: config.username || clientData.username,
        password: config.password || clientData.password,
        url: clientData.url || clientData.baseUrl,
        oms: clientData.oms,
        baseUrl: config.baseUrl || resolveUrl(clientId, clientData.url || clientData.baseUrl),
        skus: clientData.skus || [],
        facilities: clientData.facilities || [],
      };
    } catch (e) {
      console.error(
        `[CONFIG ERROR] Failed to parse CLIENTS JSON for ${clientId}: ${e.message}`
      );
    }
  }

  // Ensure we at least have a resolved URL if nothing was found in JSON
  if (!config.baseUrl) {
    config.baseUrl = resolveUrl(clientId);
  }

  return config;
};

/**
 * Discovers all configured clients
 */
const getAllClients = () => {
  const discoveredIds = new Set();

  const clientsStr = getClientsEnvString();
  if (clientsStr) {
    try {
      const match = clientsStr.match(/\{[\s\S]*\}/);
      if (match) {
        Object.keys(JSON.parse(match[0])).forEach((id) =>
          discoveredIds.add(id)
        );
      }
    } catch (e) {
      console.error("[CONFIG ERROR] Failed to parse CLIENTS in getAllClients", e);
    }
  }

  if (discoveredIds.size === 0) {
    throw new Error("No clients found in CLIENTS environment variable. Please configure at least one client.");
  }

  return Array.from(discoveredIds).map((id) => getClientConfig(id));
};

export {
  getClientConfig,
  getAllClients,
};
