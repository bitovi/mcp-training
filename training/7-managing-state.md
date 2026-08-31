# Managing State Without Sessions

## Introduction

By the end of this step, you will understand how to build MCP tools that span multiple calls, without relying on the server remembering which client it's talking to. You'll learn the explicit handle pattern: mint an id when you create some state, hand it back to the caller, and have the caller pass it back as an ordinary argument on later calls.

Every request your server receives is independent. That's what let us put the stateless HTTP server from Step 5 behind an ordinary load balancer with no special routing. It also means a tool can't lean on "the server remembers what this client was doing." When a workflow genuinely needs to span multiple calls, for example starting a task and checking on it later, the state has to live somewhere the server can look it up on demand, and the caller needs a way to say which piece of state it means.

## Problem

Your countdown tool from Step 6 runs to completion inside a single call. Plenty of real workflows don't work that way:

- **Long-running jobs**: Kick off an import, then check its status a few minutes later
- **Multi-step building**: Add items to a draft one call at a time, then submit it when done
- **Handoffs between tools**: One tool creates something, a different tool call later needs to refer back to it

Your task is to build a small task tool set: one tool starts a task and returns an id for it, a second tool advances an existing task using that id.

## What you need to know

### The pattern: mint a handle, don't assume a session

When a tool creates some state worth keeping around, it generates an id for that state (a `taskId`, a `cartId`, a `jobId`) and returns it as ordinary data in the tool result. The client holds onto that id, the same way it would hold onto any other value a tool gave it, and passes it back as a normal argument on whichever later call needs to refer to that state.

There's no session behind this and no special protocol support required. It's just: return an id, accept that id as an argument. This is exactly the shape every REST API already uses (create a resource, get an id back, refer to that id later), and it works the same way here.

### Where the state actually lives

The id is just a lookup key. The actual state lives in a plain server-side store, for example a `Map` in memory for local development, or a database or cache in production. Keying that store by the id the client hands back is what makes the lookup work, regardless of which server process or instance ends up handling the request.

```typescript
interface Task {
  label: string;
  progress: number;
  notes: string[];
}

const tasks = new Map<string, Task>();
```

An in-memory `Map` only survives as long as one process does, and only that process can see it. That's fine for local development and for this exercise. A production server backs this same lookup with something shared, like Redis or a database, so any instance can answer a request about any task.

### Handling an unknown or expired handle

A client might pass back an id your server doesn't recognize, maybe it's stale, maybe it's a typo. Treat that as an ordinary tool error rather than letting it throw:

```typescript
const task = tasks.get(taskId);

if (!task) {
  return {
    content: [{ type: "text", text: `No task found with id "${taskId}"` }],
    isError: true,
  };
}
```

## Technical Requirements

✏️ **Add a task tool set to your MCP server**:

1. **Add a `tasks` map** at module scope in `src/mcp-server.ts`, keyed by task id
2. **Register a `start-task` tool** that takes a `label` (string), creates a task with `progress: 0` and an empty notes list, stores it under a generated id, and returns that id along with the task's initial state
3. **Register an `advance-task` tool** that takes a `taskId` and a `note` (string), looks up the task, appends the note, increments `progress`, and returns the updated state
4. **Handle unknown task ids** in `advance-task` by returning a clear error instead of crashing

**Expected behaviors:**

- `start-task` returns a task id the caller can use in later calls
- `advance-task` correctly updates the task addressed by that id
- Calling `advance-task` with a made-up id returns a readable error, not a server crash
- Two different tasks stay independent of each other

## How to verify your solution

✏️ **Test with MCP Inspector**:

1. **Start your HTTP server**:

   ```bash
   npm run dev:http
   ```

2. **Connect with MCP Inspector** to `http://localhost:3000/mcp`

3. **Call `start-task`** with `label: "Import customer data"` and note the `taskId` it returns

4. **Call `advance-task`** with that `taskId` and `note: "Validated 100 rows"`, confirm `progress` is now `1` and the note appears

5. **Call `advance-task` again** with the same `taskId` and a different note, confirm `progress` is now `2` and both notes are present

6. **Call `advance-task` with a made-up id** (e.g. `"does-not-exist"`), confirm you get a readable error instead of a crash

✏️ **Test with VS Code Copilot**:

1. Ask: "Start a task called 'Draft the release notes', then advance it twice with notes about what you did"
2. Confirm Copilot reuses the same `taskId` across the follow-up calls on its own, it's just reading the id back out of the first tool's result, the same as any other returned value

💡 **Expected behavior**: two tasks started in separate calls stay fully independent, advancing one never affects the other's `progress` or `notes`.

## Solution

Here's the complete implementation of the task tool set:

### Updated MCP Server with Task State (`src/mcp-server.ts`)

```diff
+interface Task {
+  label: string;
+  progress: number;
+  notes: string[];
+}
+
+const tasks = new Map<string, Task>();
+
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

+  // Register the start-task tool
+  server.registerTool(
+    "start-task",
+    {
+      title: "Start Task",
+      description: "Start a new task and return its id",
+      inputSchema: z.object({
+        label: z.string().describe("A short description of the task")
+      })
+    },
+    async ({ label }) => {
+      const taskId = crypto.randomUUID();
+      const task: Task = { label, progress: 0, notes: [] };
+      tasks.set(taskId, task);
+
+      return {
+        content: [{
+          type: "text",
+          text: `Started task "${label}" with id ${taskId}`
+        }]
+      };
+    }
+  );
+
+  // Register the advance-task tool
+  server.registerTool(
+    "advance-task",
+    {
+      title: "Advance Task",
+      description: "Add a note to an existing task and increment its progress",
+      inputSchema: z.object({
+        taskId: z.string().describe("The id returned by start-task"),
+        note: z.string().describe("A note describing what was just done")
+      })
+    },
+    async ({ taskId, note }) => {
+      const task = tasks.get(taskId);
+
+      if (!task) {
+        return {
+          content: [{ type: "text", text: `No task found with id "${taskId}"` }],
+          isError: true
+        };
+      }
+
+      task.progress += 1;
+      task.notes.push(note);
+
+      return {
+        content: [{
+          type: "text",
+          text: `Task "${task.label}" is now at progress ${task.progress}. Notes: ${task.notes.join("; ")}`
+        }]
+      };
+    }
+  );

  return server;
}
```

**Key Changes:**

1. **`Task` interface and `tasks` map**: module-scoped state, shared by every request this process handles
2. **`start-task`**: generates a fresh id with `crypto.randomUUID()`, stores the new task under it, and returns the id as part of the tool's ordinary text result
3. **`advance-task`**: looks the task up by the `taskId` argument the caller passes back, and returns a clear `isError: true` result if that id isn't in the map
4. **No session, no `Mcp-Session-Id`, no per-connection anything**: the id is just data flowing through ordinary tool arguments and results

📁 **Reference Implementation**: [training/7-managing-state/src/mcp-server.ts](./7-managing-state/src/mcp-server.ts)

### Testing the Implementation

```bash
npm run dev:http
npx @modelcontextprotocol/inspector
```

Call `start-task`, copy the `taskId` from the result, then call `advance-task` a couple of times with that same id and different notes. Watch `progress` climb and both notes show up in the response.

## Next Steps

Your MCP server can now handle multi-step workflows without any session machinery, but what happens when someone calls your tools with bad input? Let's make them robust!

**Continue to:** [Step 8 - Validation Patterns: Schema + Runtime Rules](8-validating-mcp.md)

In the next step, you'll implement comprehensive validation using both schema validation and runtime business rules to ensure your MCP tools handle edge cases gracefully.
