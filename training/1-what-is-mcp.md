# What is MCP? How it relates to agents

Learn about the Model Context Protocol (MCP) and understand how it enables AI agents to interact with external capabilities through a standardized protocol.

## What is MCP?

MCP (Model Context Protocol) is a **protocol** based on JSON‑RPC that runs over various transports. It allows "clients" (agent applications, IDEs, chat UIs) to call capabilities hosted by **servers**.

Think of MCP as a bridge between AI agents and external services. Instead of each agent needing custom integrations for every service, MCP provides a standardized way for agents to discover and use capabilities from different providers.

## Core MCP Capabilities

MCP servers can expose four main types of capabilities:

### Tools
RPC‑like functions that clients can call to perform actions or retrieve data. Examples:
- Search Jira issues
- Create a GitHub issue  
- Query a database
- Send an email

### Resources
Readable URIs that return content, similar to files or dynamic lookups. Examples:
- Configuration files
- API documentation
- Live data feeds
- Database schemas

### Prompts
Pre‑defined prompt templates exposed by the server that clients can use. Examples:
- Code review templates
- Meeting summary formats
- Bug report templates

### Sampling Hooks
Allow a client to delegate text generation back to the server, enabling specialized AI capabilities. Examples:
- Domain-specific code completion
- Technical documentation generation
- Specialized analysis tasks

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

## MCP Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Agent/Client  │◄──►│    Transport    │◄──►│   MCP Server    │
│   (Chat UI,     │    │ (stdio or HTTP) │    │ (Tools, Resources│
│    IDE, etc.)   │    │                 │    │  Prompts, etc.) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Benefits

- **Standardization**: One protocol for all agent-service interactions
- **Discoverability**: Agents can automatically discover server capabilities
- **Security**: Built-in authentication and authorization patterns
- **Scalability**: Support for multiple clients and production deployment
- **Flexibility**: Support for both real-time and request-response patterns

## Terminology Note

Throughout this training, we'll use "server" and "tool provider" consistently with the MCP SDK terminology. Remember:
- **Client**: The AI agent, IDE, or chat application
- **Server**: The MCP service that provides tools, resources, and prompts
- **Transport**: The communication layer (stdio or Streamable HTTP)

In the next step, we'll see MCP in action by exploring an existing production MCP server before building our own.