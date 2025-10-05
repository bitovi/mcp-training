# Building Your First MCP Server with Stdio

In this step, you'll learn how to create MCP (Model Context Protocol) servers using the stdio transport. You'll understand how MCP servers communicate with clients, how to register tools that AI agents can call, and how to handle the JSON-RPC protocol that powers MCP. By the end, you'll have hands-on experience with the MCP SDK and TypeScript, and understand the fundamental architecture of MCP servers.

## Problem

You need to build a working MCP server that can be discovered and used by MCP clients. Specifically, you'll create a simple but useful tool that converts text into URL-friendly slugs. This requires understanding how to create a server, register tools, handle the communication layer, and properly format responses according to the MCP protocol.

## What you need to know

### Understanding MCP Protocol Messages

**Model Context Protocol (MCP)** uses JSON-RPC messages to enable communication between clients and servers. Here are the key message exchanges for tools:

**1. Listing available tools:**
```
Client → Server: {"jsonrpc":"2.0","method":"tools/list","id":1}
Server → Client: {
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "slugify",
        "title": "Slugify",
        "description": "Convert text to a URL-friendly slug",
        "inputSchema": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string",
              "description": "The text to convert into a URL-friendly slug"
            }
          },
          "required": ["text"]
        }
      }
    ]
  }
}
```

**2. Calling a tool:**
```
Client → Server: {
  "jsonrpc":"2.0",
  "method":"tools/call",
  "params":{"name":"slugify","arguments":{"text":"Hello World!"}},
  "id":2
}
Server → Client: {
  "jsonrpc":"2.0",
  "result":{"content":[{"type":"text","text":"hello-world"}]},
  "id":2
}
```

This standardized protocol allows any MCP client to discover and use your tools.

### MCP Transport: Stdio

**[MCP (Model Context Protocol)](https://modelcontextprotocol.io/)** supports multiple transport methods, with **stdio (Standard Input/Output)** being perfect for:
- Local development and testing
- Command-line tools that can be invoked directly
- Integration with applications that can spawn processes

#### How stdio transport works

Every program has three standard streams:

- **stdin (Standard Input)**: Where your program receives data. In MCP, clients send JSON-RPC messages through stdin.
- **stdout (Standard Output)**: Where your program sends results. In MCP, servers send JSON-RPC responses through stdout.
- **stderr (Standard Error)**: For logging and debugging. Use `console.error()` to write here.

💡 **Important**: MCP servers are **long-running processes**. Unlike typical command-line tools that process one input and exit, MCP servers stay running and handle multiple JSON-RPC messages over time.

⚠️ **Critical**: When debugging stdio servers, always use `console.error()` for logs. Writing to stdout will break MCP communication because clients expect only valid JSON-RPC messages on stdout.

### McpServer: The MCP SDK

The **MCP SDK** provides the `McpServer` class that handles the JSON-RPC protocol for you. Here's how it works:

1. **Create a server instance** with metadata (name, version)
2. **Register capabilities** (tools, resources, prompts) 
3. **Connect to a transport** (stdio, HTTP, etc.)
4. **Handle incoming requests** automatically

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ 
  name: "demo-server", 
  version: "1.0.0" 
});

// Register tools here...

const transport = new StdioServerTransport();
await server.connect(transport);
```

The `StdioServerTransport` handles reading JSON-RPC messages from stdin and writing responses to stdout, so you don't have to deal with the low-level protocol details.

### Tool Registration Pattern

Tools in MCP are registered with the server using a simple pattern:

```typescript
server.registerTool(
  "tool-name",           // Unique identifier
  {
    title: "Human Title", 
    description: "What this tool does",
    inputSchema: {
      // Parameter definitions go here
    }
  },
  async (parameters) => {
    // Tool implementation
    return { 
      content: [{ type: "text", text: "result" }] 
    };
  }
);
```

When clients request the tools list, the server automatically converts your registrations into the proper JSON-RPC response format.

### Schema Validation with Zod

**[Zod](https://zod.dev/)** is perfect for defining the `inputSchema` because it provides both validation and automatic schema generation:

```typescript
import { z } from "zod";

// Define a Zod schema
const userInfoSchema = {
  name: z.string().describe("The user's full name"),
  age: z.number().min(18).describe("User's age (must be 18 or older)")
};

// McpServer can call methods like this to get JSON Schema:
console.log(z.toJSONSchema(userInfoSchema.name));
// Output: {
//   "type": "string", 
//   "description": "The user's full name"
// }

server.registerTool(
  "create-user",
  {
    title: "Create User",
    description: "Create a new user account",
    inputSchema: userInfoSchema
  },
  async ({ name, age }) => {
    // Tool implementation here
    return { content: [{ type: "text", text: `Created user ${name}, age ${age}` }] };
  }
);
```

💡 **How it works**: The MCP SDK calls methods like `.schema()` on your Zod objects to generate the JSON Schema format that MCP clients expect. When you define `z.string().describe("...")`, calling `.schema()` returns the corresponding JSON Schema object with `"type": "string", "description": "..."`.

💡 **Why Zod is perfect for MCP**:
1. **Automatic conversion**: Zod provides `.schema()` method to generate JSON Schema
2. **Runtime validation**: Incoming parameters are validated against your schema  
3. **Type safety**: TypeScript gets proper types from your schema

## Technical Requirements


✏️ Implement your MCP server:

1. In `src/mcp-server.ts`:
   - Create and configure an `McpServer` instance named "demo-server" with version "1.0.0"
   - Register a tool called "slugify" that:
     - Takes a `text` parameter (string) with proper description
     - Uses the existing `createSlug` function
     - Returns the result in MCP content format
   - Export the configured server as the default export

2. In `src/stdio-server.ts`:
   - Import the configured server from `./mcp-server.js`
   - Create a `StdioServerTransport` and connect it to the server
   - Add appropriate error handling and logging

The server should:
- Use proper Zod schema validation with parameter descriptions
- Use `StdioServerTransport` for communication
- Return results in the proper MCP content format: `{ content: [{ type: "text", text: result }] }`
- Log to stderr to avoid interfering with MCP protocol

## How to verify your solution

🔍 Test your server in VS Code:

1. **Add your server to VS Code's MCP configuration**:
   
   Create or edit `.vscode/mcp.json` in your workspace root:
   ```json
   {
     "servers": {
       "mcp-training": {
         "type": "stdio",
         "command": "./src/stdio-server.ts",
         "cwd": "${workspaceFolder}"
       }
     }
   }
   ```
   
   💡 **Note**: This works because the `stdio-server.ts` file has a shebang line that tells the system how to execute it with the TypeScript loader.

2. **Start your MCP server**: In VS Code's MCP panel, find your "mcp-training" server and click the start button to launch it

3. **Test the server in VS Code**:
   - Open any file in VS Code
   - Start a chat with GitHub Copilot 
   - Try using your slugify tool by asking: "Can you slugify the text 'Hello World! This is a Test' using the available tools?"
   - VS Code should call your MCP server and return: "hello-world-this-is-a-test"

✏️ **Expected behavior**:
- Your server should appear in VS Code's available tools
- Copilot should be able to discover and call your slugify tool
- Test inputs and expected outputs:
  - Input: "Hello World! This is a Test" → Output: "hello-world-this-is-a-test"
  - Input: "  Special Characters: @#$%  " → Output: "special-characters"

💡 **Troubleshooting tips**:
- If VS Code can't find your server, ensure the file exists and has execute permissions (`chmod +x src/stdio-server.ts`)
- If the tool doesn't appear, check that your server is using `console.error()` for logging
- If you get connection errors, verify the server runs correctly with `./src/stdio-server.ts`
- Check VS Code's output panel for MCP-related error messages
- Use the MCP: List Servers command to see server status and logs

## Solution

Here's the complete implementation:

**Install the required dependencies**:
```bash
npm install @modelcontextprotocol/sdk zod
```

**src/mcp-server.ts** (create and configure the MCP server):
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function createSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  return slug;
}

// Factory function to create a new MCP server instance
export function createMcpServer(): McpServer {
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
      inputSchema: {
        text: z.string().describe("The text to convert into a URL-friendly slug")
      }
    },
    async ({ text }) => {
      const slug = createSlug(text);
      
      return { 
        content: [{ type: "text", text: slug }] 
      };
    }
  );

  return server;
}
```

**src/stdio-server.ts** (connect the configured server to stdio transport):
```typescript
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
```

**.vscode/mcp.json** (configure VS Code to use your server):
```json
{
  "servers": {
    "mcp-training": {
      "type": "stdio",
      "command": "./src/stdio-server.ts"
    }
  }
}
```


## Next Steps

You now have a working MCP server! In the next step, you'll learn how to use the MCP Inspector more effectively to debug and test your servers during development. 