# Live example: Using an existing MCP (GitHub)

Learn how to connect to and use a real production MCP server by configuring VS Code to work with GitHub's MCP server and making actual tool calls.

- [Problem](#problem)
- [What you need to know](#what-you-need-to-know)
  - [MCP Client Configuration in VS Code](#mcp-client-configuration-in-vs-code)
  - [OAuth 2.1 + PKCE for GitHub](#oauth-21--pkce-for-github)
  - [GitHub MCP Server Capabilities](#github-mcp-server-capabilities)
  - [Starting MCP Servers in VS Code](#starting-mcp-servers-in-vs-code)
  - [Managing Tool Limits in VS Code](#managing-tool-limits-in-vs-code)
  - [Best Practices for MCP Tool Call Prompting](#best-practices-for-mcp-tool-call-prompting)
- [How to verify your solution](#how-to-verify-your-solution)
- [Solution](#solution)
- [Next Steps](#next-steps)

## Problem

Before building an MCP server, your first task is to use GitHub Copilot to help manage GitHub issues by connecting to GitHub's MCP server, creating a new issue in the `bitovi/mcp-training` repository, and then closing it. This hands-on experience will help you understand how MCP works in practice - showing how agents discover tools, handle authentication, and make tool calls in a real-world scenario.

## What you need to know

📝 **Reference**: [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)

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

For HTTP-based servers like GitHub's, the configuration looks different:

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

### OAuth 2.1 + PKCE for GitHub

GitHub uses OAuth 2.1 with PKCE (Proof Key for Code Exchange) for secure authentication. PKCE is particularly important for applications like VS Code that can't securely store client secrets:

📝 **References**:

- [PKCE Specification (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

**Why PKCE for VS Code?**
Unlike traditional OAuth where applications are pre-registered with fixed redirect URIs, VS Code uses dynamic client registration. Since VS Code isn't hosted at a specific URL and runs locally on each user's machine, it can't safely store a client secret. PKCE solves this by using cryptographic proof instead of a shared secret.

💡 **Note**: We'll dive deeper into OAuth 2.1 and PKCE implementation patterns in later steps when building our own authenticated MCP servers.

### GitHub MCP Server Capabilities

[GitHub's MCP server](https://github.com/github/github-mcp-server) provides tools for:

- **Issues**: `create_issue`, `get_issue`, `update_issue` (can close by setting state to "closed")
- **Pull Requests**: `create_pull_request`, `get_pull_request`, `update_pull_request_branch`
- **Repositories**: `search_repositories`
- **Files**: Limited file operations may be available depending on server configuration

### Starting MCP Servers in VS Code

Once you've created an `mcp.json` configuration file:

1. **Open the file** in VS Code
2. **Look for the "Start MCP Server" button** that appears in the editor
3. **Click the button** to initiate the connection
4. **Complete OAuth flow** - VS Code will open a browser for GitHub authorization
5. **Return to VS Code** - the server connection will be established

This process handles the PKCE OAuth flow automatically, requesting appropriate scopes and establishing a secure connection to the MCP server.

### Managing Tool Limits in VS Code

When connecting to GitHub's MCP server, you'll encounter an important limitation: **tool limits**. GitHub's MCP server provides over 100 tools across issues, pull requests, repositories, and files, which immediately exceeds VS Code's default tool limit.

**What happens:**

- VS Code has a maximum number of tools it can handle simultaneously
- GitHub's comprehensive MCP server exceeds this limit
- You'll need to selectively enable only the tools you need

**Tool Management Strategies:**

- **Selective enabling**: Choose only the specific tools required for your task
- **Category-based**: Enable tool categories (e.g., only "Issues" tools)
- **Progressive activation**: Start with essential tools, add more as needed

**Common VS Code Tool Limit Solutions:**

1. **Tool filtering**: Configure which tool categories to enable
2. **Custom configurations**: Create focused MCP configurations for specific tasks
3. **Session management**: Enable different tool sets for different work sessions

💡 **Best Practice**: For this training exercise, focus on enabling only the Issues-related tools (`create_issue`, `get_issue`, `update_issue`) to avoid hitting tool limits while learning MCP fundamentals.

### Best Practices for MCP Tool Call Prompting

When working with AI agents that have access to MCP tools, effective prompting is crucial:

**Be Specific and Direct:**

- Clearly state what you want to accomplish
- Include specific parameters (repository names, issue titles, etc.)
- Avoid ambiguous language that could lead to wrong tool calls

**Provide Context:**

- Mention the repository or resource you're working with
- Include relevant details like issue numbers, usernames, or file paths
- Explain the purpose when creating content (issues, PRs, etc.)

**Use Action-Oriented Language:**

- Start with action verbs: "Create an issue...", "Close issue #42...", "Search for..."
- Be explicit about the desired outcome
- Specify any formatting or content requirements

**Research Approaches:**

- **Iterative refinement**: Start with basic prompts, then add specificity based on results
- **Template-based**: Use consistent structures for similar tasks
- **Context-aware**: Reference previous actions or existing state
- **Verification-focused**: Ask for confirmation of actions before execution

**Example Effective Prompts:**

- ✅ "Create a new issue in microsoft/vscode with title 'Feature Request: Better Terminal Integration' and describe the need for improved terminal features"
- ❌ "Make an issue about testing"
- ✅ "Close issue #42 in the mcp-training repository"
- ❌ "Close that issue"

## How to verify your solution

Using Github Copilot Chat, you should be able to:

1. Prompt the creation of a test issue in `bitovi/mcp-training`.
2. Verify the issue exists in [mcp-training's issues](https://github.com/bitovi/mcp-training/issues)
3. Prompt the closing of the test issue.

## Solution

<details>
<summary>Click to see the complete solution</summary>

### 1. Verify `.vscode/mcp.json` has already been provided

```json
{
  "servers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "type": "http"
    }
  }
}
```

### 2. Start MCP Server Connection

✏️ Perform the following to start the MCP server connection:

1. Open the `mcp.json` file in VS Code and click "Start MCP Server"
2. Complete the OAuth authorization in your browser
3. Return to VS Code and verify the connection is established

### 3. Test with GitHub Copilot Prompts

✏️ Open GitHub Copilot Chat and use these prompts:

**Create an Issue:**

> `Create a new issue in the bitovi/mcp-training repository with the title "MCP Training Exercise - [Your Name]" and body "This issue was created as part of the MCP training to test GitHub integration via VS Code and Copilot."`

**Close the Issue:**

> `Close issue #[issue_number] in the bitovi/mcp-training repository by updating its state to closed.`

### 4. Expected Tool Call Examples

When you use the prompts above, Copilot will make these MCP tool calls:

**For issue creation:**

```json
{
  "tool": "create_issue",
  "parameters": {
    "owner": "bitovi",
    "repo": "mcp-training",
    "title": "MCP Training Exercise - [Your Name]",
    "body": "This issue was created as part of the MCP training to test GitHub integration via VS Code and Copilot."
  }
}
```

**For issue closure:**

```json
{
  "tool": "update_issue",
  "parameters": {
    "owner": "bitovi",
    "repo": "mcp-training",
    "issue_number": 42,
    "state": "closed"
  }
}
```

</details>

💡 **Troubleshooting Tips:**

- If tools don't appear, ensure you completed the OAuth authorization in the browser
- For authentication errors, verify you have access to the `bitovi/mcp-training` repository
- Use the Inspector's "Request/Response" tab to debug failed tool calls

## Next Steps

Now that you've experienced MCP in action with a real production server, you're ready to build your own!

**Continue to:** [Step 3 - Building Your First MCP Server with Stdio](3-mcp-with-stdio.md)

In the next step, you'll create your first MCP server using the stdio transport and learn the fundamentals of the MCP SDK.
