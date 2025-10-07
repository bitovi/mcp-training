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
  }, {
    capabilities: {
      tools: {},
      logging: {}
    }
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

  // Register the streaming countdown tool with validation
  server.registerTool(
    "countdown",
    {
      title: "Countdown Timer",
      description: "Counts down from a number with real-time progress updates",
      inputSchema: {
        seconds: z.number()
          .int("Must be a whole number")
          .positive("Must be greater than 0")
          .describe("Number of seconds to count down from")
      }
    },
    async ({ seconds }, extra) => {
      // Business rule validation: cap at 15 seconds for demo
      if (seconds > 15) {
        throw new Error(`Countdown duration must be 15 seconds or less for this demo. You entered ${seconds} seconds.`);
      }

      // Stream countdown progress with dual notification patterns
      for (let i = seconds; i > 0; i--) {
        // 1. Logging notification (for MCP Inspector debugging)
        await extra.sendNotification({
          method: "notifications/message",
          params: {
            level: "info",
            data: `Countdown: ${i} seconds remaining`
          }
        });
        
        // 2. Progress notification (when VS Code provides progressToken)
        if (extra._meta?.progressToken) {
          await extra.sendNotification({
            method: "notifications/progress",
            params: {
              progressToken: extra._meta.progressToken,
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