# Using MCP Inspector for Development and Debugging

By the end of this step, you will understand how to use the MCP Inspector to test, debug, and explore MCP servers. You'll learn to connect to both local and remote MCP services, analyze the raw JSON-RPC protocol, and identify common issues in MCP tool implementations.

- [Problem](#problem)
- [What you need to know](#what-you-need-to-know)
  - [Installing and Running MCP Inspector](#installing-and-running-mcp-inspector)
  - [Connecting to Local stdio Servers](#connecting-to-local-stdio-servers)
  - [Connecting to Remote MCP Services](#connecting-to-remote-mcp-services)
  - [Understanding the Inspector Interface](#understanding-the-inspector-interface)
  - [Reading JSON-RPC Messages](#reading-json-rpc-messages)
  - [Authorizing with OAuth 2.1 + PKCE (Atlassian Example)](#authorizing-with-oauth-21--pkce-atlassian-example)
  - [Common Debugging Patterns](#common-debugging-patterns)
- [Technical Requirements](#technical-requirements)
- [How to verify your solution](#how-to-verify-your-solution)
- [Solution](#solution)
- [Next Steps](#next-steps)

## Problem

Your MCP server from step 3 works in VS Code, but you want to debug a specific issue where tools aren't returning the expected response format. You need a way to see the raw JSON-RPC messages and understand what's going wrong.

Your task is to use MCP Inspector to debug a broken tool implementation and learn how to systematically identify and fix MCP protocol issues.

## What you need to know

MCP Inspector is a powerful developer tool that acts as a visual client for MCP servers. It allows you to:

- Test tools, resources, and prompts interactively
- View raw JSON-RPC messages between client and server
- Debug authentication and transport issues
- Compare different MCP implementations
- Explore remote MCP services like Atlassian's Rovo

### Installing and Running MCP Inspector

MCP Inspector can be run directly with npx without installation:

```bash
# Run inspector and connect to a local stdio server
npx @modelcontextprotocol/inspector ./src/stdio-server.ts

# Run inspector standalone (for connecting to remote services)
npx @modelcontextprotocol/inspector
```

When you run the inspector, it will:

1. Start a proxy server (default port 6277)
2. Open a web interface (default port 6274)
3. Connect to your specified server (if provided)

### Connecting to Local stdio Servers

Inspector negotiates the **legacy** protocol era by default, which is a deliberate choice for a debugging tool: probing can stall against a server that never answers, and it clutters the transcript you came to read. Since your server speaks `2026-07-28`, ask for that era explicitly, otherwise the messages you inspect won't look like the ones this step describes.

The protocol era is a per-server setting, and a server named directly on the command line has nowhere to carry settings. Give it a config file instead. Create `inspector.json` in your project root:

```json
{
  "mcpServers": {
    "demo-server": {
      "type": "stdio",
      "command": "node",
      "args": ["--import", "./loader.mjs", "src/stdio-server.ts"],
      "protocolEra": "modern"
    }
  }
}
```

Then launch against that file:

```bash
npx @modelcontextprotocol/inspector --config inspector.json
```

Connect to `demo-server` from the **Servers** tab. The server card shows `MCP 2026-07-28`, and **Connection Info** confirms **Era: Modern**.

💡 `protocolEra` accepts `legacy`, `auto`, or `modern`. There is no command-line flag or environment variable for it, so a config or catalog file is the only way to set it.

### Connecting to Remote MCP Services

For remote services like Atlassian's MCP, you need to:

1. **Choose the correct transport type**: nearly every production remote server speaks Streamable HTTP

2. **Configure authentication**: Most remote services require OAuth 2.1

   - MCP Inspector supports full OAuth flows with PKCE
   - Guided vs Quick OAuth flow options
   - Automatic token management

3. **Use the correct endpoint URL**: Service discovery is important
   - Atlassian: `https://mcp.atlassian.com/v1/mcp`
   - GitHub: `https://api.githubcopilot.com/mcp/`

### Understanding the Inspector Interface

The MCP Inspector interface has two groups of panels.

**Tab bar (top)** — one tab per capability your server declared:

- **Servers**: Your server list, connection state, and per-server settings
- **Tools**: List tools, fill in arguments through a generated form, and call them
- **Prompts**: List prompt templates and render them with arguments
- **Resources**: Browse and read resources by URI

**Monitoring column (right)** — these sit in their own column rather than the tab bar, so you can watch traffic while working in Tools:

- **Protocol**: The JSON-RPC transcript, each request paired with its response
- **Console**: Your server process's stderr, which is where its own logging goes

A server with a `logging` capability, task support, or an HTTP transport also gets Logs, Tasks, or Network panels. The connected server's card shows its transport and negotiated protocol version, and **Connection Info** breaks out the protocol, era, and both sides' capabilities.

### Reading JSON-RPC Messages

MCP uses JSON-RPC 2.0 over various transports. Key message types:

**Tool Call Request**:

```json
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

**Successful Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "content": [{ "type": "text", "text": "hello-world" }]
  }
}
```

**Malformed Response (what happens with the bug)**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "message": [{ "type": "text", "text": "hello-world" }]
  }
}
```

This response looks successful but the client doesn't display any content because it expects a `content` field, not `message`.

### Authorizing with OAuth 2.1 + PKCE (Atlassian Example)

Atlassian provides a production MCP service through their Rovo platform. Here's how to connect:

1. **Transport Type**: Select "Streamable HTTP"
2. **URL**: `https://mcp.atlassian.com/v1/mcp`
3. **Authentication**: Use "Quick OAuth Flow"
4. **OAuth Scopes**: The service will automatically determine required scopes

The OAuth flow will:

- Discover OAuth metadata from the server
- Identify the Inspector to Atlassian's authorization server using a Client ID Metadata Document
- Redirect you to Atlassian for authorization
- Exchange the authorization code for access tokens
- Store tokens for subsequent requests

### Common Debugging Patterns

**Transport Issues**:

- "Connection refused": Wrong transport type or URL
- "Authentication failed": OAuth issues or missing tokens
- "Protocol error": Incorrect message format

**Tool Response Issues**:

- Missing `content` field in responses (appears successful but no content shown)
- Wrong content type (should be array of content blocks)
- Invalid JSON structure (actual errors)
- Silent failures where response format is wrong but doesn't error

**Authentication Debugging**:

- OAuth metadata discovery failures
- Token exchange errors
- Scope or permission issues

## Technical Requirements

✏️ **Debug your local server using MCP Inspector**:

1. **Install and run MCP Inspector** to connect to your local stdio server
2. **Test your slugify tool** and verify it works correctly
3. **Introduce a bug** in the tool response format to see how errors appear
4. **Analyze the error** using the inspector's raw protocol view
5. **Fix the bug** using the inspector's feedback
6. **Verify the fix** by testing the tool again
7. **Understand the debugging workflow** for future MCP development

**For step 3, replace your current tool implementation in `src/mcp-server.ts` with this broken version**:

```typescript
// Create and configure the MCP server
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0"
});

// Register tools
server.registerTool(
  "slugify",
  {
    title: "Slugify",
    description: "Convert text to a URL-friendly slug",
    inputSchema: z.object({
      text: z.string().describe("The text to convert into a URL-friendly slug")
    })
  },
  // @ts-ignore
  async ({ text }) => {
    const slug = createSlug(text);

    // BUG: Using 'message' instead of 'content'
    return {
      message: [{ type: "text", text: slug }]
    };
  }
);
```

This broken code intentionally uses `message` instead of the correct `content` field. The correct format should be:

```typescript
// This is CORRECT
return {
  content: [{ type: "text", text: slug }],
};
```

## How to verify your solution

✏️ **Test local server debugging**:

1. **Run the inspector** with your local server, using the config file so the connection is on the modern era:

   ```bash
   npx @modelcontextprotocol/inspector --config inspector.json
   ```

2. **Verify normal operation**: Test the slugify tool and confirm it returns results

3. **Introduce the bug**: Replace your tool implementation with the broken version from Technical Requirements

4. **Observe the missing response**: The inspector will show "Success" but no content will be displayed

5. **Check the raw protocol**: Look at the JSON-RPC message history to see the malformed response with `message` instead of `content`

6. **Fix the bug**: Change `message` back to `content` and verify it works

## Solution

Here's the complete solution for debugging with MCP Inspector:

**Connect to your local server**:

```bash
npx @modelcontextprotocol/inspector --config inspector.json
```

This will automatically:

- Start the inspector proxy
- Launch your stdio server
- Connect them together
- Open the web interface

**Test the working tool**:

1. In the inspector, go to the "Tools" section
2. Find the "slugify" tool
3. Click "Call Tool"
4. Enter test input: `"Hello World! Test"`
5. Verify you get: `"hello-world-test"`

**Introduce the bug in `src/mcp-server.ts`**:
Replace your current tool implementation with the broken version provided in the Technical Requirements section above. This version uses `message` instead of `content` in the return statement.

**Observe the silent failure**:

1. Restart the inspector (Ctrl+C and run again)
2. Try calling the slugify tool again
3. Notice you get a "Success" status but no visible content in the response
4. Check the **Protocol** panel to see the JSON-RPC response contains `message` instead of `content`

**Fix the bug**:

```typescript
// Register tools
server.registerTool(
  "slugify",
  {
    title: "Slugify",
    description: "Convert text to a URL-friendly slug",
    inputSchema: z.object({
      text: z.string().describe("The text to convert into a URL-friendly slug")
    })
  },
  async ({ text }) => {
    const slug = createSlug(text);

    // FIXED: Using correct 'content' field
    return {
      content: [{ type: "text", text: slug }]
    };
  }
);
```

## Next Steps

Now that you've mastered debugging with MCP Inspector, you're ready to build production-ready MCP services!

**Continue to:** [Step 5 - Building Production-Ready MCP Services with Streamable HTTP](5-mcp-services.md)

In the next step, you'll transform your local stdio server into a production HTTP service that can handle multiple clients and be deployed to the web.
