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

      // Stream countdown progress
      for (let i = seconds; i > 0; i--) {
        if (progressToken !== undefined) {
          await ctx.mcpReq.notify({
            method: "notifications/progress",
            params: {
              progressToken,
              progress: seconds - i + 1,  // Current step (1, 2, 3...)
              total: seconds,              // Total steps
              message: `${i} seconds remaining!`
            }
          });
        }

        // Wait 1 second before next update
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Return final result
      return {
        content: [{
          type: "text",
          text: "🚀 Blastoff!"
        }]
      };
    }
  );

  return server;
}
