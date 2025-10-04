# Building MCP Services in 2025 (with Node.js)

> A practical, spec‑aligned walkthrough from stdio tool provider → streamable HTTP service → OAuth 2.1 / PKCE

---

## 0) Housekeeping

* Target audience: JS/TS engineers who build AI agent integrations.
* What you’ll build today:

  1. A tiny **stdio MCP server** exposing one useful tool via `@modelcontextprotocol/sdk`.
  2. The same server as a **Streamable HTTP** service.
  3. Add **OAuth 2.1 with PKCE** for protected endpoints.
* All examples: **Node.js (TypeScript)**.

---

## 1) What is MCP? How it relates to agents

**Goal:** Ground attendees in the spec and mental model.

**Slide points**

* MCP is a **protocol** (JSON‑RPC over transports) that lets “clients” (agent apps, IDEs, chat UIs) call capabilities hosted by **servers**.
* Capabilities include:

  * **Tools**: RPC‑like functions clients can call.
  * **Resources**: Readable URIs that return content (like files or dynamic lookups).
  * **Prompts**: Pre‑defined prompt templates exposed by the server.
  * **Sampling hooks**: Let a client delegate text generation back to the server.
* Transports (2025): **stdio** and **Streamable HTTP**. HTTP+SSE is deprecated; SSE is now an **optional** channel inside Streamable HTTP.
* Agent relation: an agent (client) discovers server capabilities → invokes tools → fetches resources → uses prompts → streams results → updates context.

**Diagram (describe)**

* Client (Agent UI) ⇄ Transport (stdio | Streamable HTTP) ⇄ MCP Server (Tools / Resources / Prompts / Sampling)

**Notes**

* Keep “server vs. tool provider” terminology consistent with SDK.

---

## 2) Live example: Using an existing MCP (Atlassian)

**Goal:** Show something real before we code.

**What to demo**

* Show **MCP Inspector** connecting to Atlassian’s cloud MCP server (Rovo) and listing available tools (Jira/Confluence capabilities).
* Call a read‑only tool (e.g., search issues) to demonstrate auth‑required servers.

**Prep**

* Atlassian Cloud site, a test project, client ID, and an access token via OAuth 2.1 + PKCE.

**Talking points**

* “Server advertises scopes; client obtains token; tools enforce user’s permissions.”

---

## 3) Hello MCP (stdio): a tiny, useful tool provider

**Goal:** First contact with the TypeScript SDK.

**What we’ll build**

* `demo-server` exposing one tool: `slugify` (turn a title into a URL slug).

**Code (TypeScript, minimal)**

```ts
// src/stdio-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "demo-server", version: "1.0.0" });

server.registerTool(
  "slugify",
  {
    title: "Slugify",
    description: "Convert text to a URL-friendly slug",
    inputSchema: { text: z.string() },
  },
  async ({ text }) => {
    const slug = text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return { content: [{ type: "text", text: slug }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Run**

* `node src/stdio-server.js` (or ts-node/tsx). Ensure Node ≥ 18.

**Test with Inspector**

* `npx @modelcontextprotocol/inspector` → Connect via **stdio** → `list-tools` → call `slugify`.

**Speaker notes**

* Emphasize `registerTool` and content schema; keep output as `content: [{type:"text"...}]`.

---

## 4) Introducing MCP Inspector (workbench)

**Goal:** Make debugging/testing concrete.

**Live tour checklist**

* Connect to local server via stdio.
* Browse **Tools**, **Resources**, **Prompts** (even if server doesn’t expose them).
* Send a request; watch **request/response** JSON.
* Toggle **logging**; inspect **notifications**.
* Tip: pass args/env to your server through Inspector’s launch form.

**Troubleshooting slide**

* If “no tools,” check version mismatch and `capabilities`.
* Validate schemas with small payloads first.

---

## 5) From stdio to a **Streamable HTTP** MCP service

**Goal:** Production‑oriented transport suitable for multiple clients and hosting.

**Key concepts**

* Replace local stdio with **Streamable HTTP**.
* Typical endpoints: `POST /mcp` (client → server messages), `GET /mcp` (optional SSE stream for server → client notifications/messages), `DELETE /mcp` (end session).
* Sessions via `mcp-session-id` header; server maps each session to a transport.

**Explanation: Streamable HTTP and SSE**

* **Streamable HTTP**: a long-lived HTTP transport where clients and servers exchange JSON-RPC messages over POST/GET/DELETE. It's more scalable than stdio and allows multiple concurrent clients.
* **Server-Sent Events (SSE)**: an optional part of Streamable HTTP. The client opens a `GET /mcp` request, and the server pushes events (progress, logs, notifications) as they happen.
* **When to use Streamable HTTP**: whenever you want to deploy your MCP server on the web or need multi-client support.
* **When to add SSE**: if your tools produce intermediate results, logs, or notifications that should reach the client in real time.

**Code (TypeScript, minimal)**

```ts
// src/http-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamable-http.js";
import { Hono } from "hono";

const server = new McpServer({ name: "demo-server", version: "1.0.0" });
// (reuse the same registerTool code from stdio example)

const app = new Hono();
const transport = new StreamableHTTPServerTransport();

// POST: client → server
app.post("/mcp", async (c) => transport.handlePost(c.req, c));
// GET: optional SSE stream (server → client)
app.get("/mcp", async (c) => transport.handleGet(c.req, c));
// DELETE: end session
app.delete("/mcp", async (c) => transport.handleDelete(c.req, c));

await server.connect(transport);

export default app;
```

**Run & test**

* Launch, then connect via Inspector’s **HTTP** mode (or a simple client).

**Speaker notes**

* Contrast with deprecated HTTP+SSE: Streamable HTTP is the new baseline; SSE is optional inside it.

---

## 6) Streaming responses: when and how

**Goal:** Show partial results/notifications.

**Talking points**

* Tools can emit **notifications** or chunked responses; clients may subscribe via the GET (SSE) stream.
* Good for long‑running operations, logs, heartbeats, or progressive results.

**Add a simple streaming tool (start here)**

```ts
// Step 6: basic streaming without business rules — we'll add validation in Step 7
server.registerTool(
  "countdown",
  {
    title: "Countdown",
    description: "Streams a countdown until blastoff",
    inputSchema: { seconds: z.number().int().positive() },
  },
  async ({ seconds }, ctx) => {
    for (let i = seconds; i > 0; i--) {
      await ctx.notify({ event: "progress", data: { secondsRemaining: i } });
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { content: [{ type: "text", text: "Blastoff!" }] };
  }
);
```

---

## 7) Validation patterns (schema + runtime)

**Goal:** Demonstrate dynamic validation and great error UX.

**Talking points**

* **Schema validation** with Zod catches type/shape issues.
* **Runtime/business rules** enforce constraints your schema can’t express (e.g., rate limits, plan tiers, resource caps).
* Prefer **clear, user‑facing error messages**; optionally include error codes to help clients render UI.

**Enhance the same tool with validation**

```ts
// Step 7: add a business rule on top of the Step 6 tool
server.registerTool(
  "countdown",
  {
    title: "Countdown",
    description: "Streams a countdown until blastoff (validated)",
    inputSchema: { seconds: z.number().int().positive() },
  },
  async ({ seconds }, ctx) => {
    // Business rule: cap at 15s for demo UX
    if (seconds > 15) {
      // Consider a structured MCP error for richer client rendering
      throw new Error("'seconds' must be <= 15 for this demo");
    }
    for (let i = seconds; i > 0; i--) {
      await ctx.notify({ event: "progress", data: { secondsRemaining: i } });
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { content: [{ type: "text", text: "Blastoff!" }] };
  }
);
```

---

## 8) Authorization: OAuth 2.1 + PKCE for MCP

**Goal:** Secure your HTTP server and call into protected upstreams.

**Conceptual flow**

1. Client initiates auth with your server’s metadata (scopes, auth URL).
2. Browser‑based PKCE flow (code verifier/challenge) → Authorization Server issues **access token**.
3. Client presents token to your MCP server over HTTP headers.
4. Server validates token (introspection/JWKS) and enforces scopes per tool.

**Server hooks**

* Add middleware on `/mcp` endpoints to extract & verify `Authorization: Bearer <token>`.
* Map scopes → tool allowlist; pass user identity/claims into `ctx`.

**Demo idea**

* Protect `slugify` tool; require `demo.read` scope.


## 9) Tips & gotchas

* **Hosting:** Node 18+ on Fly/Render/Vercel functions (for GET/POST/DELETE) or a container on k8s.
* **State:** Session map must be bounded; evict on `DELETE` or idle timeout.
* **CORS:** Lock down origins for browser‑based clients.
* **Logging:** Never write non‑MCP data to stdio for stdio servers; use stderr or structured logs for HTTP.
* **Versioning:** Keep spec/SDK in sync; watch transport changes.
* **Testing:** Integrate Inspector into CI (smoke test tools, resources, prompts).

---

## 10) Conclusion

* You learned:

  * What MCP is and how agents use it.
  * Built a Node stdio server.
  * Upgraded to a Streamable HTTP service with optional SSE.
  * Secured it with OAuth 2.1 + PKCE.
* **Next steps:**

  * Add real tools (Jira/Confluence, GitHub, databases).
  * Ship observability (request IDs, timing, error taxonomies).
  * Explore **Sampling** and **Prompts** for richer clients.

---

## Appendix

**Package.json scripts**

```json
{
  "type": "module",
  "scripts": {
    "dev:stdio": "tsx src/stdio-server.ts",
    "dev:http": "tsx src/http-server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.18.0",
    "hono": "^4.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": { "tsx": "^4.0.0", "typescript": "^5.6.0" }
}
```

**Inspector one‑liners**

* `npx @modelcontextprotocol/inspector` (stdio)
* `npx @modelcontextprotocol/inspector --baseUrl http://localhost:3000/mcp` (HTTP)

**Token plumbing during demos**

