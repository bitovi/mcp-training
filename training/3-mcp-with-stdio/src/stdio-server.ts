#!/usr/bin/env -S node --import ./loader.mjs
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {createMcpServer} from "./mcp-server.js";

try {
  // Serve the factory over stdio and log once it's up
  void serveStdio(createMcpServer);
  console.error("Demo MCP server running on stdio");

} catch (error) {
  console.error("Server error:", error);
  process.exit(1);
}
