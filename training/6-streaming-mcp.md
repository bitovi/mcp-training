# Streaming MCP: Real-time Tool Responses

## Introduction

By the end of this step, you will understand how to implement streaming capabilities in your MCP tools to provide real-time progress updates and notifications to clients. You'll learn about different types of events that can be transmitted, how clients receive these events, and when streaming is most beneficial.

In step 5, we built an HTTP MCP server that handles request-response cycles. While this works well for quick operations, many real-world tools perform long-running tasks that benefit from progress updates, intermediate results, or real-time notifications. MCP's streaming capabilities allow tools to send multiple messages during execution, creating a more responsive user experience.

## Problem

Your current MCP tools operate in a simple request-response pattern:

- **No progress feedback**: Users don't know if long operations are working
- **Poor user experience**: No intermediate results or status updates
- **Timeout risks**: Long operations may hit client timeout limits
- **No real-time data**: Can't push live updates or notifications

Your task is to implement a streaming countdown tool that sends progress notifications as it executes, demonstrating how to provide real-time feedback to MCP clients.

## What you need to know

### MCP Streaming Concepts

**Notification Types:**

MCP tools can send notifications during execution to provide real-time updates to clients. These notifications are sent through the tool execution context and transmitted via the SSE (Server-Sent Events) stream.

**When to use streaming:**

- **Long-running operations**: Tasks that take more than a few seconds
- **Progress tracking**: Operations with measurable progress (file uploads, data processing)
- **Real-time data**: Live feeds, monitoring, or continuous updates
- **User feedback**: Keeping users informed during execution
- **Content streaming**: Sending intermediate results or partial content
- **Multi-client compatibility**: Adapting notifications based on client capabilities

### Tool Context Notifications

The MCP SDK provides a context object (`extra`) in tool handlers that includes a `sendNotification` method:

```typescript
async ({ inputParams }, extra) => {
  // Send a notification to the client
  await extra.sendNotification({
    method: "notifications/message",
    params: {
      level: "info",
      data: "Processing step 1 of 3...",
    },
  });

  // Continue tool execution...
  return { content: [{ type: "text", text: "Final result" }] };
};
```

### Notification Structure

**Basic notification format:**

```typescript
await extra.sendNotification({
  method: "notifications/message",
  params: {
    level: string, // Log level ("info", "debug", "warning", "error")
    data: any, // Message content (any JSON-serializable data)
  },
});
```

**Common log levels:**

- **`info`**: General information and progress updates
- **`debug`**: Detailed debugging information
- **`warning`**: Non-fatal warnings or cautions
- **`error`**: Error messages (for non-fatal errors)

### Content Streaming (For General Clients)

<!-- what progressToken? -->

When a client doesn't provide a `progressToken`, you can still stream intermediate content updates using structured notification messages:

```typescript
// Content streaming notification
await extra.sendNotification({
  method: "notifications/message",
  params: {
    level: "info",
    data: {
      type: "content",
      content: [
        {
          type: "text",
          text: "Intermediate result or progress update...",
        },
      ],
    },
  },
});
```

**Content streaming benefits:**

- **Works with any MCP client** (not just VS Code)
- **Provides intermediate results** during long operations
- **Keeps users engaged** with visible progress
- **Flexible format** - can include any content type

### MCP Progress Protocol (For VS Code Integration)

VS Code Copilot has built-in support for the official MCP progress protocol. When VS Code calls your MCP tool, it automatically includes a `progressToken` in the request metadata. You can send progress notifications using this token:

```typescript
// VS Code automatically includes progressToken in _meta
export interface RequestHandlerExtra {
  // ... other properties
  _meta?: {
    progressToken?: string;
    // ... other metadata
  };
}

// Send progress notifications
await extra.sendNotification({
  method: "notifications/progress",
  params: {
    progressToken: extra._meta?.progressToken,
    progress: currentStep, // Current progress (incremental)
    total: totalSteps, // Total steps (optional)
    message: "Processing step 3 of 10...",
  },
});
```

**VS Code Progress Display:**

- Shows **progress bars** in the Chat interface
- Displays **percentage completion** when total is provided
- Shows **real-time status messages**
- Updates **inline with the conversation**

### How Clients Receive Events

**For MCP Inspector:**

- Events appear in the **Notifications** panel in real-time
- Each notification shows the event type and data payload
- Notifications are timestamped for debugging

**For VS Code Copilot:**

- Progress notifications show as **progress bars** in the Chat interface
- Real-time progress updates appear inline with the conversation
- VS Code automatically handles `notifications/progress` protocol messages
- Progress is displayed with percentage completion and status messages

**For other MCP clients:**

- Events are received via the SSE stream (`GET /mcp` endpoint)
- Clients can subscribe to specific event types
- Events are JSON-formatted with MCP protocol structure

### Simple Streaming Implementation

Here's a countdown tool that demonstrates dual notification patterns: logging notifications (for MCP Inspector debugging) and progress notifications (for VS Code Copilot):

```typescript
server.registerTool(
  "countdown",
  {
    title: "Countdown Timer",
    description: "Counts down from a number with progress updates",
    inputSchema: {
      seconds: z.number().describe("Number of seconds to count down from"),
    },
  },
  async ({ seconds }, extra) => {
    // Stream countdown progress with dual notification patterns
    for (let i = seconds; i > 0; i--) {
      // 1. Logging notification (always - shows in MCP Inspector)
      await extra.sendNotification({
        method: "notifications/message",
        params: {
          level: "info",
          data: `Countdown: ${i} seconds remaining`,
        },
      });

      // 2. Progress notification (when VS Code provides progressToken)
      if (extra._meta?.progressToken) {
        await extra.sendNotification({
          method: "notifications/progress",
          params: {
            progressToken: extra._meta.progressToken,
            progress: seconds - i + 1, // Current step
            total: seconds, // Total steps
            message: `${i} seconds remaining`,
          },
        });
      }

      // Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Final result
    return {
      content: [
        {
          type: "text",
          text: "🚀 Blastoff!",
        },
      ],
    };
  }
);
```

## Technical Requirements

✏️ **Add a streaming countdown tool to your MCP server**:

1. **Update your MCP server** (`src/mcp-server.ts`) to include the countdown tool
2. **Use basic input schema** - just specify `seconds` as a number type
3. **Implement progress notifications** that show remaining seconds
4. **Use appropriate delays** between notifications (1 second intervals)
5. **Return a final "🚀 Blastoff!" result** when the countdown completes

**Expected behaviors:**

- Tool accepts a `seconds` parameter (number)
- Sends progress notifications every second with remaining time
- **Shows progress bars in VS Code Copilot Chat** with real-time updates
- Returns final "🚀 Blastoff!" message when complete
- Works with both MCP Inspector and your HTTP server
- Server must declare `logging: {}` capabilities to support notifications

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

3. **Open the Notifications panel** in MCP Inspector to see real-time events

4. **Call the countdown tool**:

   - Go to the "Tools" tab
   - Find the "countdown" tool
   - Enter `5` for seconds parameter
   - Click "Call Tool"

5. **Observe the streaming behavior**:
   - Watch notifications appear in real-time in the Notifications panel
   - Verify you see status and progress events
   - Confirm the final result appears after countdown completes

✏️ **Test with VS Code Copilot (Recommended)**:

1. **Ensure your server is in `.vscode/mcp.json`**:

   ```json
   {
     "servers": {
       "mcp-training-http": {
         "type": "http",
         "url": "http://localhost:3000/mcp"
       }
     }
   }
   ```

2. **Start your HTTP server**:

   ```bash
   npm run dev:http
   ```

3. **Test in VS Code Copilot Chat**:

   - Open Copilot Chat in VS Code
   - Ask: "Use the countdown tool to count down from 10 seconds"
   - **Watch for progress bars** appearing in the chat interface
   - Verify real-time progress updates with percentages
   - Confirm smooth progress bar animation

4. **Observe VS Code-specific features**:

   - **Progress bars** show completion percentage
   - **Real-time status messages** update inline
   - **Smooth animation** as progress advances
   - **Final result** appears when complete

✏️ **Test different countdown values**:

1. **Short countdown**: Try `3` seconds
2. **Longer countdown**: Try `10` seconds
3. **Verify real-time updates**: Confirm events arrive every second
4. **Check percentage calculations**: Verify progress percentages are correct

💡 **Expected streaming output**:

**In MCP Inspector (Notifications panel):**

```
Notification: info - Countdown: 5 seconds remaining
Notification: info - Countdown: 4 seconds remaining
Notification: info - Countdown: 3 seconds remaining
Notification: info - Countdown: 2 seconds remaining
Notification: info - Countdown: 1 seconds remaining
Final result: 🚀 Blastoff!
```

**In VS Code Copilot Chat:**

```
"5 seconds remaining" → "4 seconds remaining" → ... → "🚀 Blastoff!"
```

⚠️ **Troubleshooting tips**:

- If notifications don't appear, ensure your SSE stream is working (`GET /mcp` endpoint)
- Check browser console for any connection errors
- Verify your HTTP server has proper CORS headers for SSE
- Test with shorter countdowns first (3-5 seconds)
- Ensure you're using `await` with `extra.sendNotification()` calls

## Solution

Here's the complete implementation of the streaming countdown tool:

### Updated MCP Server with Streaming

### Updated MCP Server with Streaming (`src/mcp-server.ts`)

Add streaming capabilities and the countdown tool to your existing MCP server:

```diff
// Factory function to create a new MCP server instance
export function createMcpServer(): McpServer {
  // Create and configure the MCP server
  const server = new McpServer({
    name: "demo-server",
    version: "1.0.0"
-  });
+  }, {
+    capabilities: {
+      tools: {},
+      logging: {}
+    }
+  });

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

+  // Register the streaming countdown tool
+  server.registerTool(
+    "countdown",
+    {
+      title: "Countdown Timer",
+      description: "Counts down from a number with real-time progress updates",
+      inputSchema: {
+        seconds: z.number().describe("Number of seconds to count down from")
+      }
+    },
+    async ({ seconds }, extra) => {
+      // Stream countdown progress with dual notification patterns
+      for (let i = seconds; i > 0; i--) {
+        // 1. Logging notification (for MCP Inspector debugging)
+        await extra.sendNotification({
+          method: "notifications/message",
+          params: {
+            level: "info",
+            data: `Countdown: ${i} seconds remaining`
+          }
+        });
+
+        // 2. Progress notification (when VS Code provides progressToken)
+        if (extra._meta?.progressToken) {
+          await extra.sendNotification({
+            method: "notifications/progress",
+            params: {
+              progressToken: extra._meta.progressToken,
+              progress: seconds - i + 1,  // Current step (1, 2, 3...)
+              total: seconds,              // Total steps
+              message: `${i} seconds remaining!`
+            }
+          });
+        }
+
+        // Wait 1 second before next update
+        await new Promise(resolve => setTimeout(resolve, 1000));
+      }
+
+      // Return final result
+      return {
+        content: [{
+          type: "text",
+          text: "🚀 Blastoff!"
+        }]
+      };
+    }
+  );

  return server;
}
```

**Key Changes:**

1. **Lines 5-9**: Add server capabilities configuration with `logging: {}` to enable notifications
2. **Lines 27-66**: Register new "countdown" streaming tool with dual notification patterns
3. **Lines 34-41**: Implement logging notifications for MCP Inspector debugging
4. **Lines 43-52**: Implement progress notifications for VS Code progress bars
5. **Line 55**: Add 1-second delay between updates using Promise-based setTimeout
6. **Lines 58-63**: Return final "🚀 Blastoff!" result when countdown completes

📁 **Reference Implementation**: [training/6-streaming-mcp/src/mcp-server.ts](./6-streaming-mcp/src/mcp-server.ts#L5-L9,L27-L66)

### Testing the Implementation

**Start the server and test streaming**:

```bash
# Terminal 1: Start the HTTP server
npm run dev:http

# Terminal 2: Connect with Inspector
npx @modelcontextprotocol/inspector
```

**In MCP Inspector:**

1. Connect to `http://localhost:3000/mcp`
2. Open the **Notifications** panel (usually in the bottom right)
3. Go to **Tools** tab and call `countdown` with `seconds: 5`
4. Watch real-time notifications stream in

**Expected output sequence:**

1. **Progress notifications**: One per second with remaining time
2. **Tool result**: "🚀 Blastoff!" when countdown completes

### Key Implementation Details

1. **Logging capabilities**: Server must declare `logging: {}` in capabilities to support notifications
2. **RequestHandlerExtra**: Use `extra` parameter (not `ctx`) for tool context
3. **Dual notification pattern**: Demonstrates two streaming approaches for different clients:

   - **Logging notifications**: Always sent for debugging/monitoring
   - **Progress notifications**: When VS Code provides `progressToken`

4. **VS Code progress integration**: Use `notifications/progress` with `progressToken` from `extra._meta`
5. **Progress calculation**: Send incremental progress (1, 2, 3...) with total for percentage display
6. **Message format**: Include `level` and `data` fields for logging, `progress`/`total`/`message` for progress
7. **Timing control**: Using `setTimeout` to create 1-second delays
8. **Simple final result**: Clean "🚀 Blastoff!" message

This streaming implementation provides **native VS Code progress bar integration** and **logging for debugging** - demonstrating MCP streaming capabilities!

## Next Steps

Your streaming MCP server works great, but what about handling multiple clients properly? Let's implement robust session management!

**Continue to:** [Step 7 - Reconnecting MCP Sessions: Stateful Transports](7-reconnect-mcp-sessions.md)

In the next step, you'll enhance your HTTP server with proper session management to handle multiple concurrent clients with isolated state and reconnection support.
