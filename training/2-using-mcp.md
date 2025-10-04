# Live example: Using an existing MCP (Atlassian)

Learn how to connect to and use a real production MCP server by configuring VS Code to work with Atlassian's Rovo MCP server and making actual tool calls.

## Problem

Before building your own MCP server, you need to understand how MCP works in practice. You want to use GitHub Copilot to help estimate work for a specific Jira issue by connecting to a real Atlassian MCP server, loading issue details, and having Copilot analyze the scope and complexity.

This hands-on experience will show you how agents discover tools, handle authentication, and make tool calls in a real-world scenario.

## What you need to know

📝 **Reference**: [MCP Specification](https://spec.modelcontextprotocol.io/)

### MCP Client Configuration in VS Code

VS Code can act as an MCP client through configuration files. You'll create a `.vscode/mcp.json` file that tells VS Code how to connect to MCP servers:

📝 **Reference**: [VS Code MCP Extension Documentation](https://github.com/modelcontextprotocol/vscode-mcp)

```json
{
  "servers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"]
    }
  }
}
```

For HTTP-based servers like Atlassian's, the configuration looks different:

```json
{
  "servers": {
    "atlassian": {
        "url": "https://mcp.atlassian.com/v1/sse",
        "type": "http"
    }
  }
}
```

### OAuth 2.1 + PKCE for Atlassian

Atlassian uses OAuth 2.1 with PKCE (Proof Key for Code Exchange) for secure authentication. PKCE is particularly important for applications like VS Code that can't securely store client secrets:

📝 **References**: 
- [PKCE Specification (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [Atlassian MCP Server Guide](https://developer.atlassian.com/cloud/mcp/)

**Why PKCE for VS Code?**
Unlike traditional OAuth where applications are pre-registered with fixed redirect URIs, VS Code uses dynamic client registration. Since VS Code isn't hosted at a specific URL and runs locally on each user's machine, it can't safely store a client secret. PKCE solves this by using cryptographic proof instead of a shared secret.

💡 **Note**: We'll dive deeper into OAuth 2.1 and PKCE implementation patterns in later steps when building our own authenticated MCP servers.

### MCP Inspector for Testing

The MCP Inspector is a web-based tool for testing MCP connections:

```bash
npx @modelcontextprotocol/inspector
```

📝 **Reference**: [MCP Inspector Documentation](https://github.com/modelcontextprotocol/inspector)

It provides a UI to:
- Connect to MCP servers
- Browse available tools
- Make tool calls with custom parameters
- View request/response details 


### Atlassian MCP Server Capabilities

Atlassian's server provides tools for:
- **Jira**: `search_issues`, `get_issue`, `create_issue`
- **Confluence**: `search_pages`, `get_page`, `search_spaces`
- **Cross-platform**: `search` (unified across services)

## Technical Requirements

✏️ Set up your development environment to connect to Atlassian's MCP server and make your first tool calls.

### Prerequisites Setup
1. Create a free Atlassian Cloud account at [Atlassian Signup](https://id.atlassian.com/signup)
2. Create at least one Jira project or Confluence space with some content
3. Note your Atlassian site URL (e.g., `yoursite.atlassian.net`)

### VS Code MCP Configuration
1. Create a `.vscode/mcp.json` file in your project root
2. Configure it to connect to Atlassian's MCP server with proper authentication
3. Include the required OAuth scopes: `read:jira-user` and `read:confluence-content`

### Authentication Setup
1. Set up OAuth 2.1 credentials for the Atlassian MCP server
2. Configure the proper redirect URI for VS Code integration
3. Obtain an access token through the PKCE flow

### Tool Discovery and Testing
1. Use MCP Inspector to connect to the configured Atlassian server
2. List available tools and examine their schemas
3. Make at least one successful tool call (e.g., search for Jira issues)
4. Observe how authentication errors are handled when using invalid tokens

The server should be accessible at `https://api.atlassian.com/mcp/v1` and require proper OAuth authentication.

## How to verify your solution

🔍 **Test your MCP connection:**

✏️ Launch MCP Inspector:
```bash
npx @modelcontextprotocol/inspector
```

✏️ Connect to your configured Atlassian server and verify:
1. **Tool Discovery**: You can see a list of available Jira and Confluence tools
2. **Authentication**: The connection succeeds with your OAuth token
3. **Tool Execution**: You can successfully call `search_issues` or `search_pages`
4. **Error Handling**: Invalid tokens produce clear error messages

✏️ In VS Code, verify the MCP integration:
1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Look for MCP-related commands
3. Confirm your Atlassian server appears in the available servers list

**Expected successful output:**
- Tool list showing Jira and Confluence capabilities
- Successful search results from your Atlassian instance
- Proper error messages for unauthorized requests

## Solution

<details>
<summary>Click to see the complete solution</summary>

### 1. Create `.vscode/mcp.json`

```json
{
  "servers": {
    "atlassian": {
      "url": "https://mcp.atlassian.com/v1/sse",
      "type": "http"
    }
  }
}
```

### 2. Test Connection and Load Specific Issue

✏️ Launch MCP Inspector:
```bash
npx @modelcontextprotocol/inspector --config .vscode/mcp.json
```

✏️ Connect and test:
1. Select "atlassian" from the server list
2. Complete the PKCE OAuth flow (no pre-registration needed)
3. Call `get_issue` tool with issue key: `MCP-1`
4. Use the response to prompt Copilot: "Analyze this Jira issue and estimate the development effort"

### 3. Example Tool Call

**Input to `get_issue`:**
```json
{
  "issueKey": "MCP-1"
}
```

**Expected Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Issue MCP-1: Implement user authentication\nDescription: Add OAuth 2.1 login flow...\nAcceptance Criteria: [detailed requirements]"
    }
  ]
}
```

**Copilot Prompt:**
> "Based on this Jira issue, estimate the development effort in story points and identify potential technical challenges."

</details>

💡 **Troubleshooting Tips:**
- If tools don't appear, check your OAuth scopes match the server requirements
- For authentication errors, verify your Atlassian site URL is correct
- Use the Inspector's "Request/Response" tab to debug failed tool calls

📝 **Additional Resources:**
- [MCP Specification](https://spec.modelcontextprotocol.io/)