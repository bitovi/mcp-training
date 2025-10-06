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