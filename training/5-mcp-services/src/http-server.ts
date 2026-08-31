#!/usr/bin/env -S node --import ./loader.mjs
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createMcpServer } from "./mcp-server.js";

// Build the MCP handler: a fresh server instance serves every request
const handler = createMcpHandler(createMcpServer);
const node = toNodeHandler(handler);

// createMcpExpressApp gives you express.json() and DNS-rebinding
// protection (Host/Origin validation) already wired up
const app = createMcpExpressApp();

// The one route your server needs
app.all('/mcp', (req, res) => void node(req, res, req.body));

app.listen(3000, () => {
  console.error('MCP HTTP server listening on http://127.0.0.1:3000/mcp');
});
