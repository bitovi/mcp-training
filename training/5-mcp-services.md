# Building Production-Ready MCP Services with Streamable HTTP

By the end of this step, you will understand how to transform your local stdio MCP server into a production-ready HTTP service that can handle multiple clients and be deployed to the web.

Streamable HTTP is the MCP transport built for this. It gives you:

- **Multiple concurrent clients** connecting to the same server
- **Web deployment** on platforms like Vercel, Render, or traditional servers
- **Real-time streaming** with Server-Sent Events (SSE) for long-running operations
- **Horizontal scalability**, since no per-client state lives on any single server instance
- **Production features** like authentication, CORS, and proper error handling

You'll learn about the Streamable HTTP transport and build a complete HTTP-based MCP server.

- [Problem](#problem)
- [What you need to know](#what-you-need-to-know)
  - [Why Streamable HTTP Fits Production](#why-streamable-http-fits-production)
  - [The MCP Endpoint: POST /mcp](#the-mcp-endpoint-post-mcp)
  - [State Without Sessions](#state-without-sessions)
  - [Connecting to HTTP MCP Services](#connecting-to-http-mcp-services)
  - [Required Dependencies](#required-dependencies)
  - [Security Considerations](#security-considerations)
- [Technical Requirements](#technical-requirements)
- [How to verify your solution](#how-to-verify-your-solution)
- [Solution](#solution)
- [Next Steps](#next-steps)

## Problem

Your stdio MCP server from step 3 works great locally, but it has limitations:

- **Single client only**: Only one process can connect at a time
- **Local only**: Can't be deployed to the web or accessed remotely
- **Limited scalability**: The subprocess model doesn't scale well

Your task is to convert your stdio server to use Streamable HTTP transport, making it suitable for production deployment while maintaining the same functionality.

## What you need to know

### Why Streamable HTTP Fits Production

Here's what makes Streamable HTTP the right transport for a hosted service:

1. **One endpoint**: a single URL (`/mcp`) handles every request
2. **No per-client state on the server**: any request can be answered by any server instance, which is what makes horizontal scaling and simple load balancing possible
3. **Standardized error handling**: consistent HTTP status codes and JSON-RPC error responses
4. **Built-in security requirements**: required `Origin`/`Host` validation to prevent DNS rebinding attacks
5. **Production ready**: designed for hosting, autoscaling, and monitoring behind an ordinary load balancer

### The MCP Endpoint: POST /mcp

Your server exposes exactly one HTTP route, and it only accepts `POST`.

- **Purpose**: carry a single JSON-RPC request or notification from client to server
- **Body**: one JSON-RPC message
- **Response**: either a plain JSON object, or an SSE stream scoped to that one request (carrying any progress or log notifications the call produces, followed by its final result)

```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28

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

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "content": [{ "type": "text", "text": "hello-world" }]
  }
}
```

Every request stands on its own: it carries the protocol version it speaks (mirrored into the `MCP-Protocol-Version` header) right alongside the call itself, so any server instance can answer it correctly without needing to look anything up first.

### State Without Sessions

If a tool genuinely needs to remember something across calls, for example a shopping cart or a multi-step import job, it doesn't rely on the server remembering the client. Instead, the tool hands back an explicit id (a `cart_id`, a `job_id`) in its result, and the client passes that id back as an ordinary argument on the next call. You'll build exactly this pattern in [Step 7](7-managing-state.md).

### Connecting to HTTP MCP Services

You've already learned how to connect to HTTP MCP services in step 4 when you connected to Atlassian's service! The same principles apply:

1. **Transport Type**: Select "Streamable HTTP" in MCP Inspector
2. **Endpoint URL**: Point to the server's `/mcp` endpoint
3. **Authentication**: Configure OAuth, bearer tokens, or custom headers as needed

### Required Dependencies

For building HTTP MCP servers with Express, you'll need:

```bash
npm install @modelcontextprotocol/server @modelcontextprotocol/express @modelcontextprotocol/node express
```

- **`@modelcontextprotocol/server`**: the `McpServer` class and `createMcpHandler`, which turns a server factory into a plain web-standard HTTP handler
- **`@modelcontextprotocol/node`**: adapts that handler to Node's `(req, res)` style
- **`@modelcontextprotocol/express`**: `createMcpExpressApp`, a small wrapper that gives you an Express app with JSON parsing and DNS-rebinding protection already wired up

### Security Considerations

The [MCP specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http#security--endpoint) requires several security measures:

1. **Host and Origin Validation**: reject requests whose `Host` or `Origin` header doesn't match your server, to prevent DNS rebinding attacks
2. **Localhost Binding**: bind to `127.0.0.1` not `0.0.0.0` for local development
3. **Authentication**: implement proper auth for all connections
4. **CORS Headers**: configure Cross-Origin Resource Sharing appropriately

`createMcpExpressApp` handles the Host/Origin check for you automatically when bound to localhost, which is why the solution below uses it instead of building the checks by hand.

## Technical Requirements

✏️ **Convert your stdio server to Streamable HTTP**:

1. **Create a new HTTP server file** separate from your stdio server
2. **Install the HTTP dependencies** listed above
3. **Mount the MCP handler** on a single `/mcp` route
4. **Confirm DNS-rebinding protection is active** (it's on by default when bound to localhost)
5. **Create a startup script** to run the HTTP server
6. **Test with both MCP Inspector and VS Code** to verify compatibility

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

4. **Check the raw protocol**: Confirm `tools/call` responses include `"resultType": "complete"`

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
- **Requests from a non-localhost `Origin`** get rejected with `403`
- **Graceful error handling** for malformed requests

⚠️ **Troubleshooting tips**:

- If port 3000 is busy, change it in your server code
- Check that the HTTP packages are properly installed with `npm list @modelcontextprotocol/express`
- Verify the `/mcp` endpoint path is exactly correct
- Check console output for server startup messages and errors

## Solution

Here's the complete solution for creating a production-ready HTTP MCP server:

### Step 1: Install Dependencies

```bash
npm install @modelcontextprotocol/express @modelcontextprotocol/node express
```

### Step 2: Create HTTP Server (`src/http-server.ts`)

Transform the skeleton HTTP server into a working Streamable HTTP implementation:

```diff
#!/usr/bin/env -S node --import ./loader.mjs
-// import { createMcpExpressApp } from "@modelcontextprotocol/express";
-// import { toNodeHandler } from "@modelcontextprotocol/node";
-// import { createMcpHandler } from "@modelcontextprotocol/server";
-// import { createMcpServer } from "./mcp-server.js";
+import { createMcpExpressApp } from "@modelcontextprotocol/express";
+import { toNodeHandler } from "@modelcontextprotocol/node";
+import { createMcpHandler } from "@modelcontextprotocol/server";
+import { createMcpServer } from "./mcp-server.js";

// Build the MCP handler: a fresh server instance serves every request
-
+const handler = createMcpHandler(createMcpServer);
+const node = toNodeHandler(handler);

// createMcpExpressApp gives you express.json() and DNS-rebinding
// protection (Host/Origin validation) already wired up
-
+const app = createMcpExpressApp();

// The one route your server needs
-
+app.all('/mcp', (req, res) => void node(req, res, req.body));

-// app.listen(3000, () => {
-//   console.error('MCP HTTP server listening on http://127.0.0.1:3000/mcp');
-// });
+app.listen(3000, () => {
+  console.error('MCP HTTP server listening on http://127.0.0.1:3000/mcp');
+});
```

**Key Changes:**

1. **Lines 2-5**: Uncomment the imports for `createMcpExpressApp`, `toNodeHandler`, `createMcpHandler`, and your server factory
2. **Line 9**: Build the handler from your `createMcpServer` factory. A fresh `McpServer` instance is created per request
3. **Line 13**: Create the Express app via `createMcpExpressApp`, which arms Host/Origin validation for you
4. **Line 16**: Mount the handler on the single `/mcp` route, forwarding the already-parsed body
5. **Final lines**: Uncomment `app.listen(...)` to actually start the server

📁 **Reference Implementation**: [training/5-mcp-services/src/http-server.ts](./5-mcp-services/src/http-server.ts#L2-L5,L9,L13,L16)

### Step 3: Update VS Code Configuration (`.vscode/mcp.json`)

Add HTTP server configuration alongside existing stdio server:

```diff
{
  "servers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "type": "http"
    },
    "mcp-training-stdio": {
      "type": "stdio",
      "command": "./src/stdio-server.ts"
+    },
+    "mcp-training-http": {
+      "type": "http",
+      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**Key Changes:**

1. **Lines 10-13**: Add new "mcp-training-http" server configuration
2. **Line 11**: Configure as HTTP transport type
3. **Line 12**: Point to localhost HTTP endpoint on port 3000

📁 **Reference Implementation**: [training/5-mcp-services/.vscode/mcp.json](./5-mcp-services/.vscode/mcp.json#L10-L13)

### Step 4: Test the Implementation

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

## Next Steps

Your HTTP MCP server can handle multiple clients, but what about long-running operations? Let's add real-time streaming capabilities!

**Continue to:** [Step 6 - Streaming MCP: Real-time Tool Responses](6-streaming-mcp.md)

In the next step, you'll implement streaming capabilities to provide real-time progress updates and notifications to MCP clients.
