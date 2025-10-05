# Building Production-Ready MCP Services with Streamable HTTP

## Introduction

By the end of this step, you will understand how to transform your local stdio MCP server into a production-ready HTTP service that can handle multiple clients and be deployed to the web. You'll learn about Streamable HTTP transport, understand why it's the new baseline for MCP services, and build a complete HTTP-based MCP server.

Streamable HTTP is the evolution of MCP transport that enables:

- **Multiple concurrent clients** connecting to the same server
- **Web deployment** on platforms like Vercel, Render, or traditional servers
- **Real-time streaming** with Server-Sent Events (SSE) for long-running operations
- **Session management** for stateful interactions
- **Production features** like authentication, CORS, and proper error handling

## Problem

Your stdio MCP server from step 3 works great locally, but it has limitations:

- **Single client only**: Only one process can connect at a time
- **Local only**: Can't be deployed to the web or accessed remotely
- **No session state**: Each connection is isolated
- **Limited scalability**: Subprocess model doesn't scale well

Your task is to convert your stdio server to use Streamable HTTP transport, making it suitable for production deployment while maintaining the same functionality.

## What you need to know

### Why Streamable HTTP is the New Baseline

According to the [official MCP specification](https://modelcontextprotocol.io/docs/concepts/transports), Streamable HTTP **replaces the deprecated HTTP+SSE transport** from earlier protocol versions. Here's why it's now the standard:

1. **Simplified Architecture**: Single endpoint (`/mcp`) handles all operations vs separate SSE and POST endpoints
2. **Better Error Handling**: Standardized HTTP status codes and error responses
3. **Improved Session Management**: Built-in session ID support with proper lifecycle management
4. **Enhanced Security**: Required Origin validation and authentication patterns
5. **Production Ready**: Designed for hosting, scaling, and monitoring

### Understanding the Three HTTP Methods

Streamable HTTP uses three specific HTTP methods for different purposes:

#### **POST /mcp - Client to Server Messages**
- **Purpose**: Send JSON-RPC requests, responses, and notifications from client to server
- **Body**: Single JSON-RPC message
- **Response**: Either immediate JSON response or SSE stream for long-running operations
- **Example**: Tool calls, resource requests, prompt invocations

```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream
Mcp-Session-Id: abc123

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "slugify",
    "arguments": { "text": "Hello World" }
  }
}
```

#### **GET /mcp - Server to Client Messages**
- **Purpose**: Open SSE stream for server-initiated messages (notifications, progress updates)
- **Response**: `text/event-stream` with JSON-RPC messages as events
- **Use Cases**: Progress notifications, logging, real-time updates
- **Optional**: Servers can return `405 Method Not Allowed` if they don't support streaming

```http
GET /mcp HTTP/1.1
Accept: text/event-stream
Mcp-Session-Id: abc123

# Response:
data: {"jsonrpc":"2.0","method":"notification","params":{"progress":50}}
```

#### **DELETE /mcp - Session Termination**
- **Purpose**: Explicitly terminate a session and clean up server resources
- **Body**: Empty
- **Response**: `204 No Content` on success
- **Benefit**: Proper resource cleanup vs waiting for timeouts

```http
DELETE /mcp HTTP/1.1
Mcp-Session-Id: abc123
```

### Session Management with Headers

Streamable HTTP introduces session management through headers:

- **`Mcp-Session-Id`**: Unique session identifier returned by server during initialization
- **`MCP-Protocol-Version`**: Protocol version (e.g., `2025-06-18`) for compatibility
- **Session Lifecycle**: Initialize → Use → Terminate → Cleanup

### Connecting to HTTP MCP Services

You've already learned how to connect to HTTP MCP services in step 4 when you connected to Atlassian's service! The same principles apply:

1. **Transport Type**: Select "Streamable HTTP" or "SSE" in MCP Inspector
2. **Endpoint URL**: Point to the server's `/mcp` endpoint
3. **Authentication**: Configure OAuth, bearer tokens, or custom headers as needed
4. **Session Handling**: Client automatically manages session IDs and protocol headers

### Required Dependencies

For building HTTP MCP servers, you'll need:

**[Hono](https://hono.dev/)**: Fast, lightweight web framework
- **Why Hono**: TypeScript-first, edge-runtime compatible, minimal overhead
- **Alternatives**: Express.js (heavier), Fastify (more complex), native Node.js (verbose)

```bash
npm install hono @modelcontextprotocol/sdk
```

### Security Considerations

The [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#security-warning) requires several security measures:

1. **Origin Validation**: Validate `Origin` header to prevent DNS rebinding attacks
2. **Localhost Binding**: Bind to `127.0.0.1` not `0.0.0.0` for local development
3. **Authentication**: Implement proper auth for all connections
4. **CORS Headers**: Configure Cross-Origin Resource Sharing appropriately

## Technical Requirements

✏️ **Convert your stdio server to Streamable HTTP**:

1. **Create a new HTTP server file** separate from your stdio server
2. **Install Hono dependency** for HTTP framework
3. **Implement the three HTTP endpoints** (POST, GET, DELETE)
4. **Configure session management** with proper headers
5. **Add security measures** including Origin validation
6. **Create a startup script** to run the HTTP server
7. **Test with both MCP Inspector and VS Code** to verify compatibility

**Create the following file structure**:
```
src/
├── stdio-server.ts     (existing)
├── http-server.ts      (new - main HTTP server)
└── mcp-server.ts       (existing - configured MCP server)
```

**Add a package.json script** for running the HTTP server:
```json
{
  "scripts": {
    "dev:http": "node --import ./loader.mjs src/http-server.ts"
  }
}
```

## How to verify your solution

✏️ **Test with MCP Inspector**:

1. **Start your HTTP server**:
   ```bash
   npm run dev:http
   ```

2. **Connect with MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector
   ```
   - Transport Type: "Streamable HTTP"
   - URL: `http://localhost:3000/mcp`
   - Click "Connect"

3. **Verify tool functionality**: Test your slugify tool works the same as stdio version

4. **Check session management**: Look for `Mcp-Session-Id` in the Raw Protocol panel

✏️ **Test with VS Code**:

1. **Update your `.vscode/mcp.json`**:
   ```json
   {
     "servers": {
       "mcp-training-http": {
         "type": "http",
         "url": "http://localhost:3000/mcp"
       },
       "mcp-training-stdio": {
         "type": "stdio",
         "command": "./src/stdio-server.ts"
       }
     }
   }
   ```

2. **Test both servers** work in VS Code's MCP panel

3. **Compare functionality** between stdio and HTTP versions

💡 **Expected behaviors**:

- **HTTP server starts** on port 3000 with `/mcp` endpoint
- **Multiple clients** can connect simultaneously (test with Inspector + VS Code)
- **Same tool functionality** as stdio version
- **Session IDs** appear in protocol messages
- **Proper HTTP status codes** for different scenarios
- **Graceful error handling** for malformed requests

⚠️ **Troubleshooting tips**:

- If port 3000 is busy, change it in your server code
- Check that Hono is properly installed with `npm list hono`
- Verify the `/mcp` endpoint path is exactly correct
- Look for CORS issues if connecting from different origins
- Check console output for server startup messages and errors

## Solution

Here's the complete solution for creating a production-ready HTTP MCP server:

### Step 1: Install Dependencies

```bash
npm install express @types/express
```

### Step 2: Create HTTP Server

**src/http-server.ts** (new file): See [complete implementation](./5-mcp-services/src/http-server.ts)

### Step 5: Update VS Code Configuration

**.vscode/mcp.json** (add HTTP server): See [mcp-training-http server configuration](./5-mcp-services/.vscode/mcp.json#L10-L13)

### Step 5: Test the Implementation

**Start the HTTP server**:
```bash
npm run dev:http
```

**Test with MCP Inspector**:
```bash
npx @modelcontextprotocol/inspector
# Set Transport Type: "Streamable HTTP"
# Set URL: "http://localhost:3000/mcp"
# Click Connect and test your tools
```

**Test with VS Code**: Open the MCP panel and verify both servers work

## Bonus: Testing with Remote Clients using ngrok

Want to test your MCP server with ChatGPT or other remote systems? Use **[ngrok](https://ngrok.com/)** to create a secure tunnel:

### Step 1: Install and Setup ngrok

```bash
# Install ngrok
npm install -g ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Create Secure Tunnel

```bash
# In a separate terminal, create tunnel to your MCP server
ngrok http 3000
```

This gives you a public URL like `https://abc123.ngrok.io`

### Step 3: Update Security Settings

**src/http-server.ts** (add ngrok origin):
```typescript
// Add basic CORS headers for all origins
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
  
  await next();
});
```

### Step 4: Test with Remote Clients

- **MCP Inspector**: Use `https://abc123.ngrok.io/mcp` as the URL
- **ChatGPT**: Configure your MCP server URL (if supported)
- **Other MCP clients**: Point them to your ngrok URL

⚠️ **Security Warning**: Only use ngrok for testing! Production deployments should use proper hosting with authentication.

This bonus section shows how your local MCP server can be instantly accessible worldwide, demonstrating the power of Streamable HTTP transport for production deployments.

💡 **What's Next**: This implementation uses a single transport for all clients (stateless mode), which works great for testing but isn't suitable for production with multiple concurrent clients. In the next step, you'll learn how to implement proper session management for handling multiple clients with isolated state.

