# Reconnecting MCP Sessions: Stateful Transports

## Introduction

By the end of this step, you will understand how to manage multiple client connections to your MCP HTTP server using session management. You'll learn about session lifecycles, state isolation between clients, and how to properly handle reconnections and cleanup.

In step 5, we built a simple HTTP server that used a single transport for all requests (stateless mode). While this works for basic testing, production MCP servers need to handle multiple concurrent clients, each with their own isolated state and session management.

## Problem

Your current HTTP server has several limitations when dealing with multiple clients:

- **No state isolation**: All clients share the same transport instance
- **No reconnection support**: Clients can't resume sessions after network interruptions  
- **No proper cleanup**: No way to clean up resources when clients disconnect
- **Scalability issues**: Cannot handle many concurrent clients efficiently
- **SSE streaming problems**: Server-sent events need persistent per-client connections

Your task is to implement proper session management that allows multiple clients to connect simultaneously, each with their own isolated session and transport instance.

## What you need to know

### Session Management Concepts

**Session Lifecycle:**
1. **Initialization**: Client sends first request, server creates new session
2. **Active Usage**: Client uses `Mcp-Session-Id` header for all subsequent requests
3. **Termination**: Client sends DELETE request or session times out
4. **Cleanup**: Server removes session and frees resources

**Session Headers:**
- **`Mcp-Session-Id`**: Unique identifier for the session
- **`MCP-Protocol-Version`**: Protocol version for compatibility
- **Session ID generation**: Server responsibility, should be unique and secure

### Transport Per Session Pattern

The MCP SDK expects a **one transport per session** pattern:

```typescript
// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Each session gets its own transport instance
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => generateUniqueId(),
  onsessioninitialized: (sessionId) => {
    // Store the transport for this session
    transports[sessionId] = transport;
  }
});
```

### Session Initialization Flow

**First Request (no session ID):**
1. Client sends POST without `Mcp-Session-Id` header
2. Server creates new transport with session ID generator
3. Server connects MCP server to new transport
4. Transport calls `onsessioninitialized` callback with new session ID
5. Server stores transport in session map
6. Response includes new session ID in headers

**Subsequent Requests (with session ID):**
1. Client includes `Mcp-Session-Id: <session-id>` header
2. Server looks up existing transport in session map
3. Server uses existing transport to handle request
4. No new transport creation needed

### Cleanup and Resource Management

**Automatic Cleanup:**
```typescript
transport.onclose = () => {
  if (transport.sessionId) {
    console.log(`Cleaning up session: ${transport.sessionId}`);
    delete transports[transport.sessionId];
  }
};
```

**Manual Cleanup (DELETE requests):**
- Client sends DELETE request to terminate session
- Server calls `transport.handleRequest()` which triggers cleanup
- Transport calls `onclose` callback
- Session is removed from map

### Error Handling Patterns

**Invalid Session ID:**
```typescript
if (!sessionId || !transports[sessionId]) {
  res.status(400).json({ error: 'Invalid or missing session ID' });
  return;
}
```

**Initialization vs Reconnection:**
```typescript
if (sessionId && transports[sessionId]) {
  // Existing session - reuse transport
  transport = transports[sessionId];
} else {
  // New session - create transport
  transport = new StreamableHTTPServerTransport({ ... });
}
```

## Technical Requirements

✏️ **Enhance your HTTP server with session management**:

1. **Add session storage map** to track transports by session ID
2. **Implement session detection logic** in POST handler
3. **Create new transports** for new sessions with proper callbacks
4. **Reuse existing transports** for established sessions
5. **Add cleanup handlers** for when sessions close
6. **Update GET and DELETE handlers** to use session-specific transports
7. **Add proper error handling** for invalid session IDs

**Expected behaviors:**
- Multiple clients can connect simultaneously with different session IDs
- Each client maintains isolated state through their own transport
- Clients can reconnect using their existing session ID
- Sessions are properly cleaned up when clients disconnect
- Server handles invalid session IDs gracefully

## How to verify your solution

✏️ **Test with multiple MCP Inspector instances**:

1. **Start your HTTP server**:
   ```bash
   npm run dev:http
   ```

2. **Connect first Inspector instance**:
   ```bash
   npx @modelcontextprotocol/inspector
   ```
   - Transport Type: "Streamable HTTP"
   - URL: `http://localhost:3000/mcp`
   - Click "Connect"
   - Note the session ID in the console output

3. **Connect second Inspector instance**:
   - Open a new terminal
   - Run the same `npx @modelcontextprotocol/inspector` command
   - Connect to the same URL
   - Verify it gets a different session ID

4. **Test session isolation**:
   - Call tools from both instances
   - Verify each works independently
   - Check server logs show different session IDs

5. **Test reconnection**:
   - Note a session ID from the server logs
   - Disconnect and reconnect an Inspector instance
   - Verify it can reuse the same session (implementation dependent)

✏️ **Test session cleanup**:

1. **Monitor server logs** to see session creation messages
2. **Disconnect a client** and verify cleanup messages
3. **Send DELETE request** manually to test explicit cleanup:
   ```bash
   curl -X DELETE http://localhost:3000/mcp \
     -H "Mcp-Session-Id: <session-id>"
   ```

💡 **Expected behaviors**:

- **Multiple session IDs**: Each client gets unique session ID
- **Isolated operation**: Clients don't interfere with each other
- **Proper logging**: Clear messages for session creation and cleanup
- **Error handling**: Invalid session IDs return 400 Bad Request
- **Resource cleanup**: Sessions are removed when clients disconnect

⚠️ **Troubleshooting tips**:

- Check server console for session ID generation and storage messages
- Verify each client gets a unique session ID on first connection
- Look for cleanup messages when clients disconnect
- Test with `curl` if Inspector behavior is unclear
- Ensure your session map is properly typed and managed

## Solution

Here's the complete implementation of session-managed HTTP MCP server:

### Enhanced HTTP Server with Session Management

**src/http-server.ts** (updated with session management):
```typescript
#!/usr/bin/env node --import ./loader.mjs
import express from 'express';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import server from "./mcp-server.js";

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

      // Connect the MCP server to this transport
      await server.connect(transport);
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
  console.log(`🔍 Test with: npx @modelcontextprotocol/inspector`);
});
```

### Testing the Implementation

**Start the server and test with multiple clients**:
```bash
npm run dev:http
```

**Open multiple terminals and connect with Inspector**:
```bash
# Terminal 1
npx @modelcontextprotocol/inspector

# Terminal 2  
npx @modelcontextprotocol/inspector

# Each should get a different session ID
```

**Test session cleanup**:
```bash
# Manually terminate a session
curl -X DELETE http://localhost:3000/mcp \
  -H "Mcp-Session-Id: abc123" \
  -H "Content-Type: application/json"
```

### Key Implementation Details

1. **Session Storage**: `Record<string, StreamableHTTPServerTransport>` maps session IDs to transport instances

2. **Session Detection**: Check for `mcp-session-id` header in requests to determine if this is a new or existing session

3. **Transport Creation**: Each session gets its own transport instance with unique session ID generator

4. **Cleanup Handling**: `transport.onclose` callback removes sessions from the map when transports close

5. **Error Handling**: Invalid session IDs return 400 Bad Request with clear error messages

This implementation provides proper isolation between clients while maintaining efficient resource usage and cleanup.