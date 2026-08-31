# Streaming MCP: Real-time Tool Responses

## Introduction

By the end of this step, you will understand how to implement streaming capabilities in your MCP tools to provide real-time progress updates to clients. You'll learn how progress updates work, how clients receive them, and when streaming is most beneficial.

In step 5, we built an HTTP MCP server that handles request-response cycles. While this works well for quick operations, many real-world tools perform long-running tasks that benefit from progress updates. MCP's streaming capabilities let a tool send progress updates while it works, creating a more responsive user experience.

## Problem

Your current MCP tools operate in a simple request-response pattern:

- **No progress feedback**: Users don't know if long operations are working
- **Poor user experience**: No intermediate status updates
- **Timeout risks**: Long operations may hit client timeout limits

Your task is to implement a streaming countdown tool that sends progress updates as it executes, demonstrating how to provide real-time feedback to MCP clients.

## What you need to know

### MCP Streaming Concepts

**How it works:**
When a client wants progress updates for a call, it includes a `progressToken` in that request. While your tool handler runs, it can send `notifications/progress` messages carrying that same token. Those notifications travel on the same response stream as the call itself, arriving before the final result.

**When to use streaming:**

- **Long-running operations**: Tasks that take more than a few seconds
- **Progress tracking**: Operations with measurable progress (file uploads, data processing)
- **User feedback**: Keeping users informed during execution

### Tool Context: `ctx.mcpReq`

Every tool handler receives a context object as its second argument. The request-scoped helpers, including progress reporting, live on `ctx.mcpReq`:

```typescript
async ({ inputParams }, ctx) => {
  const progressToken = ctx.mcpReq._meta?.progressToken;

  if (progressToken !== undefined) {
    await ctx.mcpReq.notify({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 1,
        total: 3,
        message: "Processing step 1 of 3...",
      },
    });
  }

  // Continue tool execution...
  return { content: [{ type: "text", text: "Final result" }] };
};
```

### Progress Notification Structure

```typescript
await ctx.mcpReq.notify({
  method: "notifications/progress",
  params: {
    progressToken: string, // The token the client sent in this request
    progress: number, // Current progress; must increase on every notification
    total: number, // Optional: total steps, enables percentage display
    message: string, // Optional: human-readable status
  },
});
```

A client only sends a `progressToken` if it wants progress updates for that particular call. If there's no token, skip sending notifications entirely, the client isn't listening for them.

### How Clients Receive Events

**For MCP Inspector:**

- Progress updates appear in the **Notifications** panel in real-time
- Each notification shows the current progress, total, and message
- Notifications are timestamped for debugging

**For VS Code Copilot:**

- Progress notifications show as **progress bars** in the Chat interface
- VS Code automatically includes a `progressToken` on every tool call and renders updates inline with the conversation, complete with percentage completion

Both clients read the same `notifications/progress` messages. VS Code just renders them as a progress bar instead of a log line.

### Simple Streaming Implementation

Here's a countdown tool that sends a progress update once per second:

```typescript
server.registerTool(
  "countdown",
  {
    title: "Countdown Timer",
    description: "Counts down from a number with progress updates",
    inputSchema: z.object({
      seconds: z.number().describe("Number of seconds to count down from"),
    }),
  },
  async ({ seconds }, ctx) => {
    const progressToken = ctx.mcpReq._meta?.progressToken;

    for (let i = seconds; i > 0; i--) {
      if (progressToken !== undefined) {
        await ctx.mcpReq.notify({
          method: "notifications/progress",
          params: {
            progressToken,
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
- Sends a progress notification every second with remaining time, when the caller asked for progress
- **Shows progress bars in VS Code Copilot Chat** with real-time updates
- Returns final "🚀 Blastoff!" message when complete
- Works with both MCP Inspector and your HTTP server

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
   - Watch progress notifications appear in real-time in the Notifications panel
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
Progress: 1/5 - 5 seconds remaining
Progress: 2/5 - 4 seconds remaining
Progress: 3/5 - 3 seconds remaining
Progress: 4/5 - 2 seconds remaining
Progress: 5/5 - 1 seconds remaining
Final result: 🚀 Blastoff!
```

**In VS Code Copilot Chat:**

```
"5 seconds remaining" → "4 seconds remaining" → ... → "🚀 Blastoff!"
```

⚠️ **Troubleshooting tips**:

- If notifications don't appear, confirm the client actually sent a `progressToken` on the call, no token means your tool has nothing to attach notifications to
- Check browser console for any connection errors
- Test with shorter countdowns first (3-5 seconds)
- Ensure you're using `await` with `ctx.mcpReq.notify()` calls

## Solution

Here's the complete implementation of the streaming countdown tool:

### Updated MCP Server with Streaming (`src/mcp-server.ts`)

Add the countdown tool to your existing MCP server:

```diff
// Factory function to create a new MCP server instance
export function createMcpServer(): McpServer {
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
+      inputSchema: z.object({
+        seconds: z.number().describe("Number of seconds to count down from")
+      })
+    },
+    async ({ seconds }, ctx) => {
+      const progressToken = ctx.mcpReq._meta?.progressToken;
+
+      // Stream countdown progress
+      for (let i = seconds; i > 0; i--) {
+        if (progressToken !== undefined) {
+          await ctx.mcpReq.notify({
+            method: "notifications/progress",
+            params: {
+              progressToken,
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

1. **New tool registration**: Register a "countdown" streaming tool alongside the existing "slugify" tool
2. **Read the progress token**: Pull `progressToken` off `ctx.mcpReq._meta`, and only send notifications when a client actually asked for them
3. **Send progress on each tick**: One `ctx.mcpReq.notify(...)` call per second, carrying the current step, total, and a status message
4. **1-second delay** between updates using a Promise-based `setTimeout`
5. **Final result**: Return the "🚀 Blastoff!" message once the loop completes

📁 **Reference Implementation**: [training/6-streaming-mcp/src/mcp-server.ts](./6-streaming-mcp/src/mcp-server.ts)

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

1. **`ctx.mcpReq`**: every request-scoped helper (progress, the abort signal) lives here
2. **`progressToken` is opt-in**: only send progress when the caller included one
3. **Progress calculation**: send incrementing progress (1, 2, 3...) with a total for percentage display
4. **Timing control**: `setTimeout` creates the 1-second delays between updates
5. **Simple final result**: a clean "🚀 Blastoff!" message once the countdown finishes

## Next Steps

Your streaming MCP server works great, but what about a tool that needs to remember something across multiple calls, without relying on the server to track who's calling? Let's build that.

**Continue to:** [Step 7 - Managing State Without Sessions](7-managing-state.md)

In the next step, you'll build a tool that hands back an explicit state handle the client passes back on later calls, the pattern MCP servers use to stay stateless while still supporting multi-step workflows.
