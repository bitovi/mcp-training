#!/usr/bin/env -S node --import ./loader.mjs
import express from 'express';
// import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
// import { createMcpServer } from "./mcp-server.js";

process.on('uncaughtException', (error) => {
  console.error(error);
  process.exit(1);
});
process.on('unhandledRejection', console.error);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Create a single transport for all requests (stateless mode)


// Connect the MCP server to the transport


// POST /mcp - Client to server messages (tool calls, etc.)
app.post('/mcp', async (req, res) => {

});

// Helper function for GET and DELETE requests that require existing sessions
const handleExistingSession = async (req: express.Request, res: express.Response) => {

};

// GET /mcp - Server to client messages (SSE stream for notifications)
app.get('/mcp', handleExistingSession);

// DELETE /mcp - Session termination
app.delete('/mcp', handleExistingSession);

// Start server
const port = 3000;
app.listen(port, '127.0.0.1', () => {
  console.log(`🚀 MCP HTTP Server starting on http://localhost:${port}`);
  console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
});