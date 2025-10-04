#!/usr/bin/env node --import ./loader.mjs
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

try {
  const server = new McpServer({ 
    name: "demo-server", 
    version: "1.0.0" 
  });

  // Register all tools
  registerTools(server);

  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with MCP protocol
  console.error("Demo MCP server running on stdio");
} catch (error) {
  console.error("Server error:", error);
  process.exit(1);
}