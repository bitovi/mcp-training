#!/usr/bin/env -S node --import ./loader.mjs
//import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {createMcpServer} from "./mcp-server.js";

try {
  // Create stdio transport
  

  // Connect server to transport
  

  // Log to stderr so it doesn't interfere with MCP protocol
  
} catch (error) {
  console.error("Server error:", error);
  process.exit(1);
}