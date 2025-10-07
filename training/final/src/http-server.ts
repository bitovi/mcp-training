#!/usr/bin/env -S node --import ./loader.mjs
import express from 'express';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp-server.js";
import { addOAuthToApp } from "./auth/oauth-wrapper.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers FIRST
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Add OAuth endpoints and authentication AFTER CORS
addOAuthToApp(app);

// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// POST /mcp - Client to server messages (tool calls, etc.)
app.post('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
      console.log(`♻️ Reusing existing transport for session: ${sessionId}`);
    } else {
      // Create new transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => Math.random().toString(36).substring(2),
        onsessioninitialized: (newSessionId: string) => {
          console.log(`📦 Storing transport for new session: ${newSessionId}`);
          transports[newSessionId] = transport;
        },
      });

      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`🧹 Cleaning up session: ${transport.sessionId}`);
          delete transports[transport.sessionId];
        }
      };

      // Create a new MCP server instance for this session
      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);
      console.log('🔗 MCP server connected to new transport');
    }

    // Handle the request through MCP transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('POST /mcp error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper function for GET and DELETE requests that require existing sessions
const handleExistingSession = async (req: express.Request, res: express.Response) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({ error: 'Invalid or missing session ID' });
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error(`${req.method} /mcp error:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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