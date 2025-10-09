# What is MCP? How it relates to agents

Learn about the Model Context Protocol (MCP) and understand how it enables AI agents to interact with external capabilities through a standardized protocol.

- [What is MCP?](#what-is-mcp)
- [Core MCP Capabilities](#core-mcp-capabilities)
  - [Tools](#tools)
  - [Resources](#resources)
  - [Prompts](#prompts)
  - [Sampling Hooks](#sampling-hooks)
- [MCP Transports (2025)](#mcp-transports-2025)
  - [stdio](#stdio)
  - [Streamable HTTP](#streamable-http)
- [How Agents Use MCP](#how-agents-use-mcp)
- [Terminology Note](#terminology-note)
- [Next Steps](#next-steps)

## What is MCP?

MCP (Model Context Protocol) is a **protocol** based on JSON‑RPC that runs over various transports. It allows "clients" (agent applications, IDEs, chat UIs) to call capabilities hosted by **servers**.

Think of MCP as a bridge between AI agents and external services. Instead of each agent needing custom integrations for every service, MCP provides a standardized way for agents to discover and use capabilities from different providers.

## Core MCP Capabilities

MCP servers can expose four main types of capabilities:

### Tools

[Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) are RPC‑like functions that clients can call to perform actions or retrieve data. Examples:

- Search Jira issues
- Create a GitHub issue
- Query a database
- Send an email

### Resources

[Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) are readable URIs that return content, similar to files or dynamic lookups. Resources represent **data that exists** rather than **actions to perform**.

**Key differences from tools:**

- **Discoverable**: Agents can list and browse available resources
- **Cacheable**: Content can be cached since resources are relatively static
- **URI-based**: Use templated URI patterns for easy access
- **Content-focused**: Represent "things that exist" vs "actions to take"

**Examples:**

- Configuration files
- API documentation
- Live data feeds
- Database schemas
- Log files
- Project documentation

**Agent capabilities with resources:**

- VS Code and other agents can treat resources as virtual files
- Display resources in tree views or file explorers
- Cache frequently accessed resources for performance
- Use resource content for IntelliSense and autocomplete
- Preview resource content without executing actions

**Context efficiency:**

- **Resources can be cached**: Fetch once, reference multiple times without re-loading
- **Selective loading**: Agents can load only relevant parts of large resources
- **Reference vs execution**: Resources can be referenced by URI without full content in context
- **Tools require execution context**: Each tool call needs parameters, execution trace, and results

**Example context patterns:**

- **Resource approach**: Load database schema once → reference throughout conversation
- **Tool approach**: Each "get schema info" call → new context consumption
- **Best for**: Content referenced multiple times (schemas, docs, configs)
- **Consider tools for**: One-off queries or when only small data fragments are needed

**When to use resources vs tools:**

- **Resource**: Database schema, API docs, config files (content)
- **Tool**: Query database, call API, update config (actions)

### Prompts

[Prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts) are pre‑defined prompt templates exposed by the server that clients can use. Examples:

- Code review templates
- Meeting summary formats
- Bug report templates

### Sampling Hooks

[Sampling hooks](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling) allow servers to **use the client's AI capabilities** for text/data generation within tool workflows. Sampling hooks enable servers to leverage the client's AI model without needing their own.

**How it works:**

1. Client calls a server tool
2. Server processes the request but needs AI-generated data
3. **Server asks client's AI** to generate structured content (JSON, YAML, etc.)
4. **Server receives the AI-generated data** and uses it programmatically
5. Server returns final processed result to client

**Key differences from tools:**

- **Tools**: Server executes logic → returns result
- **Sampling hooks**: Server executes logic → **asks client AI for help** → continues processing → returns result

**Real-world example:**

- Tool: `deploy_application("web app with Redis, 1000 users")`
- Server asks client AI: "Convert requirements to YAML config"
- Client AI generates structured YAML
- Server uses YAML to deploy actual infrastructure

**Why use sampling hooks:**

- Server gets structured AI-generated data it can process
- Server doesn't need its own AI model or API costs
- Client maintains control over AI model access and user permissions

## MCP Transports (2025)

In 2025, MCP supports two primary transports:

### stdio

- Direct process communication
- Great for local development and testing
- Single client per server instance
- Simple setup and debugging

### Streamable HTTP

- Web-based transport using HTTP requests
- Supports multiple concurrent clients
- Production-ready for hosted services
- Optional Server-Sent Events (SSE) for real-time updates

> **Note:** HTTP+SSE is deprecated. SSE is now an **optional** channel inside Streamable HTTP rather than a separate transport.

## How Agents Use MCP

The typical flow of an agent using MCP services:

1. **Discovery**: Agent connects to MCP server and discovers available capabilities
2. **Tool Invocation**: Agent calls tools to perform actions or gather information
3. **Resource Fetching**: Agent retrieves content from resources as needed
4. **Prompt Usage**: Agent uses server-provided prompts for consistent formatting
5. **Streaming Results**: Agent receives real-time updates through optional SSE
6. **Context Updates**: Agent incorporates results into its working context

## Terminology Note

Throughout this training, we'll use "server" and "tool provider" consistently with the MCP SDK terminology. Remember:

- **Client**: The AI agent, IDE, or chat application
- **Server**: The MCP service that provides tools, resources, and prompts
- **Transport**: The communication layer (stdio or Streamable HTTP)

## Next Steps

Now that you understand what MCP is and its core capabilities, let's see it in action!

**Continue to:** [Step 2 - Using MCP](2-using-mcp.md)
