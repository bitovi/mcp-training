//import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
//import { z } from "zod";

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

export function registerTools(/*server: McpServer*/) {
  
}