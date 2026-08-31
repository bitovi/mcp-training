# What is MCP? How it relates to agents

Learn about the Model Context Protocol (MCP) and understand how it enables AI agents to interact with external capabilities through a standardized protocol.

- [What is MCP?](#what-is-mcp)
- [Core MCP Capabilities](#core-mcp-capabilities)
  - [Tools](#tools)
  - [Resources](#resources)
  - [Prompts](#prompts)
  - [Elicitation](#elicitation)
- [MCP Transports](#mcp-transports)
  - [stdio](#stdio)
  - [Streamable HTTP](#streamable-http)
- [How Agents Use MCP](#how-agents-use-mcp)
- [MCP Architecture](#mcp-architecture)
- [Key Benefits](#key-benefits)
- [Terminology Note](#terminology-note)

## What is MCP?

MCP (Model Context Protocol) is a **protocol** based on JSON-RPC that runs over a small set of transports. It lets "clients" (agent applications, IDEs, chat UIs) call capabilities hosted by **servers**.

Think of MCP as a universal connector between AI agents and external services. Instead of every agent needing a custom integration for every service it wants to use, MCP gives agents one standard way to discover and call capabilities from any provider that speaks the protocol.

Each request an agent sends is self-contained: it carries the protocol version it speaks and the capabilities it supports right along with the request. A server can inspect any single request and know exactly how to respond to it, without needing to remember anything about earlier requests from that same agent. This is what makes MCP servers easy to scale: any server instance can handle any request, and there's no per-agent state to keep in sync between instances.

## Core MCP Capabilities

MCP servers can expose these types of capabilities:

### Tools

[Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) are RPC-like functions that clients can call to perform actions or retrieve data. Examples:

- Search Jira issues
- Create a GitHub issue
- Query a database
- Send an email

### Resources

[Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) are readable URIs that return content, similar to files or dynamic lookups. Resources represent **data that exists** rather than **actions to perform**.

**Key differences from tools:**

- **Discoverable**: Agents can list and browse available resources
- **Cacheable**: Servers attach a freshness hint (`ttlMs`) to resource results, so agents know how long they can reuse a value before fetching it again
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

- **Resource approach**: Load database schema once, reference it throughout the conversation
- **Tool approach**: Each "get schema info" call consumes fresh context
- **Best for**: Content referenced multiple times (schemas, docs, configs)
- **Consider tools for**: One-off queries or when only small data fragments are needed

**When to use resources vs tools:**

- **Resource**: Database schema, API docs, config files (content)
- **Tool**: Query database, call API, update config (actions)

### Prompts

[Prompts](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts) are pre-defined prompt templates exposed by the server that clients can use. Examples:

- Code review templates
- Meeting summary formats
- Bug report templates

### Elicitation

[Elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) lets a server ask the user, through the client, for information it needs mid-task, without the agent having to guess or the developer having to pre-collect every possible input up front.

**Real-world example:**

- A tool starts a database migration and discovers it needs a target environment name that wasn't part of the original call
- The server pauses the tool and asks the client to collect that value from the user
- The client shows the user a prompt, gets an answer, and the tool call continues with that answer included

**Why it matters:**

- Tools can stay simple, with a small, well-defined input schema, instead of trying to anticipate every input a task might eventually need
- Users stay in control of what information they share and when
- Servers get structured answers back (not free text they have to parse)

## MCP Transports

MCP supports two transports:

### stdio

- Direct process communication over standard input/output
- Great for local development and testing
- Single client per server instance
- Simple setup and debugging

### Streamable HTTP

- Web-based transport using ordinary HTTP requests
- Supports many concurrent clients, since no per-client session state lives on the server
- Production-ready for hosted services
- A tool call's progress updates and log messages travel back to the client on the response stream of that same call
- Clients can opt into a separate stream for change notifications (for example, being told the tool list changed) without needing one open per request

## How Agents Use MCP

The typical flow of an agent using MCP services:

1. **Discovery**: The agent asks the server what it supports (protocol version, capabilities, available tools, resources, and prompts)
2. **Tool Invocation**: The agent calls tools to perform actions or gather information
3. **Resource Fetching**: The agent retrieves content from resources as needed
4. **Prompt Usage**: The agent uses server-provided prompts for consistent formatting
5. **Streaming Results**: While a tool call runs, progress updates and log messages ride the response stream of that same call, arriving before the final result
6. **Elicitation**: If a tool needs more information mid-task, the server asks the client to collect it from the user
7. **Context Updates**: The agent incorporates results into its working context

## Terminology Note

Throughout this training, we'll use "server" and "tool provider" consistently with the MCP SDK terminology. Remember:

- **Client**: The AI agent, IDE, or chat application
- **Server**: The MCP service that provides tools, resources, and prompts
- **Transport**: The communication layer (stdio or Streamable HTTP)

## Next Steps

Now that you understand what MCP is and its core capabilities, let's see it in action!

**Continue to:** [Step 2 - Using MCP](2-using-mcp.md)
