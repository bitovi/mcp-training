# MCP Training: Building Model Context Protocol Servers

This comprehensive training teaches you how to build production-ready MCP (Model Context Protocol) servers using Node.js and TypeScript. You'll progress from basic concepts to advanced features like authentication, streaming, and validation.

> **Spec version:** this training targets **[MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog)**, the current stable release.

👉 Bitovi can help you integrate this into your own SDLC workflow: [AI for Software Teams](https://www.bitovi.com/ai-for-software-teams)

## What You'll Learn

By the end of this training, you'll understand how to:

- **Connect AI agents to external services** using the MCP protocol
- **Build both stdio and HTTP MCP servers** for different deployment scenarios
- **Implement real-time streaming capabilities** for long-running operations
- **Add robust validation patterns** with schema and business rule validation
- **Secure your services** with OAuth 2.1 + PKCE authentication
- **Deploy production-ready MCP servers** that can handle multiple concurrent clients

## Need help with this training or AI?

This training is open-sourced by **[Bitovi](https://www.bitovi.com/)**, a consulting company that helps organizations implement AI capabilities and modern development practices. 

Bitovi provides consulting services for:
- AI agent development and MCP integration
- Custom tool development for enterprise workflows  
- Production deployment and scaling strategies
- Team training and best practices

Contact Bitovi to accelerate your AI initiatives with expert guidance. 

## Training Steps

### [Step 0: Setup](training/0-setup.md)
**Environment Setup and Prerequisites**

Choose between two setup options: **Dev Container** (one-click setup with Docker) or **Manual Installation** (full control). Both provide everything needed for the training.

- **Option A**: Dev Container with pre-configured Node.js 20, VS Code extensions, and port forwarding
- **Option B**: Manual installation of Node.js 20+, Git, VS Code, and dependencies
- Clone the training repository and verify both stdio and HTTP servers work
- Ready to start building MCP servers!

### [Step 1: What is MCP?](training/1-what-is-mcp.md)
**Understanding the Model Context Protocol**

Learn the fundamentals of MCP, how it enables AI agents to interact with external services, and understand the core capabilities (tools, resources, prompts, elicitation).

- MCP protocol overview and architecture
- Core capabilities: tools, resources, prompts, elicitation
- Transport methods: stdio vs Streamable HTTP
- How agents discover and use MCP services
- Key benefits and use cases

### [Step 2: Using MCP](training/2-using-mcp.md)
**Hands-on Experience with Production MCP Services**

Connect VS Code to GitHub's production MCP server and perform real operations like creating and managing GitHub issues. Experience MCP from the client perspective.

- Configure VS Code as an MCP client
- Connect to GitHub's MCP server with OAuth 2.1 + PKCE
- Create and manage GitHub issues through AI agents
- Understand client-server communication patterns
- Learn effective prompting strategies for MCP tools

### [Step 3: Building Your First MCP Server](training/3-mcp-with-stdio.md)
**MCP Server Development with Stdio Transport**

Build your first MCP server using stdio transport. Create a text slugification tool and understand the JSON-RPC protocol, tool registration patterns, and schema validation with Zod.

- Create MCP server with stdio transport
- Implement tool registration and input schemas
- Build a practical slugify tool
- Handle JSON-RPC protocol communication
- Use Zod for input validation and type safety
- Connect your server to VS Code

### [Step 4: MCP Inspector](training/4-mcp-inspector.md)
**Development and Debugging Tools**

Master the MCP Inspector for testing, debugging, and exploring MCP servers. Learn to analyze JSON-RPC messages, connect to remote services, and identify common implementation issues.

- Install and use MCP Inspector for development
- Debug tool implementations and protocol issues
- Connect to remote MCP services (like Atlassian's Rovo)
- Analyze JSON-RPC message flows
- Troubleshoot common MCP server problems

### [Step 5: HTTP MCP Services](training/5-mcp-services.md)
**Production-Ready HTTP Transport**

Transform your stdio server into a production-ready HTTP service using Streamable HTTP transport. Enable multiple concurrent clients and web deployment capabilities.

- Convert stdio server to Streamable HTTP transport
- Implement the single `POST /mcp` endpoint
- Understand why the stateless model scales behind an ordinary load balancer
- Configure DNS-rebinding protection and security measures
- Deploy HTTP servers for production use
- Handle multiple concurrent client connections

### [Step 6: Streaming MCP](training/6-streaming-mcp.md)
**Real-time Progress Updates**

Add streaming capabilities to provide real-time progress updates. Build a countdown tool that streams progress on the same response stream as the call itself.

- Implement MCP progress notifications
- Read a client's `progressToken` and report progress against it
- Handle long-running operations with user feedback
- Support both MCP Inspector and VS Code clients
- Understand how progress notifications ride a request's own response stream

### [Step 7: Managing State Without Sessions](training/7-managing-state.md)
**Multi-Step Workflows on a Stateless Server**

Build tools that span multiple calls without relying on the server remembering which client it's talking to. Learn the explicit handle pattern: mint an id, hand it back, accept it as an ordinary argument later.

- Mint a server-side handle (id) when a tool creates state worth keeping
- Store that state in a plain server-side lookup, keyed by the handle
- Accept the handle back as an ordinary tool argument on later calls
- Handle an unknown or expired handle as a normal tool error
- Verify multiple concurrent clients stay fully independent

### [Step 8: Validation Patterns](training/8-validating-mcp.md)
**Schema and Business Rule Validation**

Enhance your tools with robust validation using both Zod schema validation and custom business rules. Provide clear, user-friendly error messages for validation failures.

- Implement layered validation (schema + business rules)
- Add runtime constraints and limits
- Create user-friendly error messages
- Handle validation failures gracefully
- Test validation with edge cases
- Balance flexibility with constraints

### [Step 9: OAuth Authentication](training/9-authorizing-mcp.md)
**Secure MCP Services with OAuth 2.1 + PKCE**

Secure your MCP server with OAuth 2.1 authentication using PKCE for enhanced security. Implement the complete OAuth flow for production deployment.

- Implement OAuth 2.1 + PKCE authentication
- Create OAuth discovery endpoints
- Identify clients via Client ID Metadata Documents (CIMD)
- Implement authorization and token exchange flows, including resource-bound tokens
- Secure MCP endpoints with Bearer tokens verified on every request
- Support VS Code and other MCP clients

## Project Structure

```
mcp-training/
├── .devcontainer/         # Dev Container configuration (Docker setup)
├── training/              # Step-by-step training materials
│   ├── 0-setup.md
│   ├── 1-what-is-mcp.md
│   ├── 2-using-mcp.md
│   ├── 3-mcp-with-stdio.md
│   ├── 4-mcp-inspector.md
│   ├── 5-mcp-services.md
│   ├── 6-streaming-mcp.md
│   ├── 7-managing-state.md
│   ├── 8-validating-mcp.md
│   ├── 9-authorizing-mcp.md
│   └── final/              # Complete reference implementation
├── src/                   # Your working implementation
│   ├── mcp-server.ts      # Core MCP server configuration
│   ├── stdio-server.ts    # Stdio transport implementation
│   ├── http-server.ts     # HTTP transport implementation
│   └── auth/              # OAuth 2.1 + PKCE authorization server (Step 9)
└── package.json          # Dependencies and scripts
```

## Getting Started

Choose your preferred setup method in **Step 0**:

### Quick Start (Dev Container)
1. **Install Docker** and the **VS Code Dev Containers extension**
2. **Clone the repository**: `git clone https://github.com/bitovi/mcp-training.git`
3. **Open in VS Code**: `code mcp-training`
4. **Reopen in Container** when prompted - everything sets up automatically!

### Manual Setup
1. **Follow Step 0** for detailed manual installation instructions
2. **Install Node.js 20+, Git, and VS Code** with required extensions
3. **Clone and configure** the project manually

### Then for both approaches:
1. **Progress through each step sequentially** - each builds on the previous
2. **Use the reference implementations** in `training/{step}/` folders when needed
3. **Test your implementation** with both MCP Inspector and VS Code
4. **Experiment and extend** the examples with your own tools and features

 
