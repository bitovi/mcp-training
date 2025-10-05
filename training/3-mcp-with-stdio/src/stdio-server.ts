#!/usr/bin/env node --import ./loader.mjs
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {createMcpServer} from "./mcp-server.js";

try {
  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await createMcpServer().connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol
  console.error("Demo MCP server running on stdio");
  
} catch (error) {
  console.error("Server error:", error);
  process.exit(1);
}