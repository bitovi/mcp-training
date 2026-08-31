import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

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

interface Task {
  label: string;
  progress: number;
  notes: string[];
}

const tasks = new Map<string, Task>();

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

  // Register the streaming countdown tool
  server.registerTool(
    "countdown",
    {
      title: "Countdown Timer",
      description: "Counts down from a number with real-time progress updates",
      inputSchema: z.object({
        seconds: z.number().describe("Number of seconds to count down from")
      })
    },
    async ({ seconds }, ctx) => {
      const progressToken = ctx.mcpReq._meta?.progressToken;

      for (let i = seconds; i > 0; i--) {
        if (progressToken !== undefined) {
          await ctx.mcpReq.notify({
            method: "notifications/progress",
            params: {
              progressToken,
              progress: seconds - i + 1,
              total: seconds,
              message: `${i} seconds remaining!`
            }
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        content: [{
          type: "text",
          text: "🚀 Blastoff!"
        }]
      };
    }
  );

  // Register the start-task tool
  server.registerTool(
    "start-task",
    {
      title: "Start Task",
      description: "Start a new task and return its id",
      inputSchema: z.object({
        label: z.string().describe("A short description of the task")
      })
    },
    async ({ label }) => {
      const taskId = crypto.randomUUID();
      const task: Task = { label, progress: 0, notes: [] };
      tasks.set(taskId, task);

      return {
        content: [{
          type: "text",
          text: `Started task "${label}" with id ${taskId}`
        }]
      };
    }
  );

  // Register the advance-task tool
  server.registerTool(
    "advance-task",
    {
      title: "Advance Task",
      description: "Add a note to an existing task and increment its progress",
      inputSchema: z.object({
        taskId: z.string().describe("The id returned by start-task"),
        note: z.string().describe("A note describing what was just done")
      })
    },
    async ({ taskId, note }) => {
      const task = tasks.get(taskId);

      if (!task) {
        return {
          content: [{ type: "text", text: `No task found with id "${taskId}"` }],
          isError: true
        };
      }

      task.progress += 1;
      task.notes.push(note);

      return {
        content: [{
          type: "text",
          text: `Task "${task.label}" is now at progress ${task.progress}. Notes: ${task.notes.join("; ")}`
        }]
      };
    }
  );

  return server;
}
