# Building MCP Services (with Node.js)

> A practical, spec-aligned walkthrough from stdio tool provider → streamable HTTP service → OAuth 2.1 / PKCE

> **Spec version:** [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog), the current stable release. Stateless protocol: no session handshake, no `Mcp-Session-Id`.

---

## 0) Housekeeping

* Target audience: JS/TS engineers who build AI agent integrations.
* What you'll build today:

  1. A tiny **stdio MCP server** exposing one useful tool via `@modelcontextprotocol/server`.
  2. The same server as a **Streamable HTTP** service.
  3. Add **OAuth 2.1 with PKCE** for protected endpoints.
* All examples: **Node.js (TypeScript)**.

---

## 1) What is MCP? How it relates to agents

**Goal:** Ground attendees in the spec and mental model.

**Slide points**

* MCP is a **protocol** (JSON-RPC over transports) that lets "clients" (agent apps, IDEs, chat UIs) call capabilities hosted by **servers**.
* Capabilities include:

  * **Tools**: RPC-like functions clients can call.
  * **Resources**: Readable URIs that return content (like files or dynamic lookups).
  * **Prompts**: Pre-defined prompt templates exposed by the server.
  * **Elicitation**: Lets a server ask the user, through the client, for information it needs mid-task.
* Transports: **stdio** and **Streamable HTTP**.
* Every request is self-contained: it carries its protocol version and capabilities right along with it, so any server instance can handle any request.
* Agent relation: an agent (client) discovers server capabilities → invokes tools → fetches resources → uses prompts → streams results → updates context.

**Diagram (describe)**

* Client (Agent UI) ⇄ Transport (stdio | Streamable HTTP) ⇄ MCP Server (Tools / Resources / Prompts)

**Notes**

* Keep "server vs. tool provider" terminology consistent with SDK.

---

## 2) Live example: Using an existing MCP (Atlassian)

**Goal:** Show something real before we code.

**What to demo**

* Show **MCP Inspector** connecting to Atlassian's cloud MCP server (Rovo) over Streamable HTTP and listing available tools (Jira/Confluence capabilities).
* Call a read-only tool (e.g., search issues) to demonstrate auth-required servers.

**Prep**

* Atlassian Cloud site, a test project, and an OAuth 2.1 + PKCE flow through Inspector.

**Talking points**

* "Server advertises scopes; client obtains token; tools enforce user's permissions."
* The client identifies itself via a Client ID Metadata Document (CIMD), a small JSON file it hosts at a fixed URL, rather than pre-registering.

---

## 3) Hello MCP (stdio): a tiny, useful tool provider

**Goal:** First contact with the TypeScript SDK.

**What we'll build**

* `demo-server` exposing one tool: `slugify` (turn a title into a URL slug).

**Code (TypeScript, minimal)**

```ts
// src/stdio-server.ts
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

function createServer(): McpServer {
  const server = new McpServer({ name: "demo-server", version: "1.0.0" });

  server.registerTool(
    "slugify",
    {
      title: "Slugify",
      description: "Convert text to a URL-friendly slug",
      inputSchema: z.object({ text: z.string() }),
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

  return server;
}

void serveStdio(createServer);
console.error("demo MCP server running on stdio");
```

**Run**

* `npx tsx src/stdio-server.ts`. Node 20+.

**Test with Inspector**

* `npx @modelcontextprotocol/inspector npx tsx src/stdio-server.ts` → `list-tools` → call `slugify`.

**Speaker notes**

* Emphasize `registerTool` and content schema; keep output as `content: [{type:"text"...}]`.
* `inputSchema` takes a single `z.object({...})`, not a bare key-value shape.

---

## 4) Introducing MCP Inspector (workbench)

**Goal:** Make debugging/testing concrete.

**Live tour checklist**

* Connect to local server via stdio.
* Browse **Tools**, **Resources**, **Prompts** (even if server doesn't expose them).
* Send a request; watch **request/response** JSON, including the `resultType` field on every result.
* Toggle **logging**; inspect **notifications**.
* Tip: pass args/env to your server through Inspector's launch form.

**Troubleshooting slide**

* If "no tools," check version mismatch and `capabilities`.
* Validate schemas with small payloads first.

---

## 5) From stdio to a **Streamable HTTP** MCP service

**Goal:** Production-oriented transport suitable for multiple clients and hosting.

**Key concepts**

* Replace local stdio with **Streamable HTTP**.
* One endpoint: `POST /mcp`. No `GET`, no `DELETE`, no session id.
* The server replies with either a plain JSON object, or an SSE stream scoped to that one request (progress/log notifications, then the final result).
* Stateless by default: any server instance can answer any request, so it sits behind an ordinary load balancer with no sticky routing.

**Code (TypeScript, minimal)**

```ts
// src/http-server.ts
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createServer } from "./mcp-server.js";

const handler = createMcpHandler(createServer);
const node = toNodeHandler(handler);

// Express app with express.json() and DNS-rebinding protection already wired up
const app = createMcpExpressApp();

app.all("/mcp", (req, res) => void node(req, res, req.body));

app.listen(3000);
```

**Run & test**

* Launch, then connect via Inspector's **Streamable HTTP** mode (or a simple client).

**Speaker notes**

* One route, one method. No session map to build or clean up.
* If a tool needs to remember something across calls, it hands back an explicit id (Step 7), it doesn't lean on the transport for that.

---

## 6) Streaming responses: when and how

**Goal:** Show progress notifications on a long-running call.

**Talking points**

* A client that wants progress includes a `progressToken` on the call; the handler sends `notifications/progress` carrying that token.
* Those notifications ride the same response stream as the call itself, arriving before the final result.
* Good for long-running operations where you want to keep the user informed.

**Add a streaming tool**

```ts
server.registerTool(
  "countdown",
  {
    title: "Countdown",
    description: "Streams a countdown until blastoff",
    inputSchema: z.object({ seconds: z.number().int().positive() }),
  },
  async ({ seconds }, ctx) => {
    const progressToken = ctx.mcpReq._meta?.progressToken;

    for (let i = seconds; i > 0; i--) {
      if (progressToken !== undefined) {
        await ctx.mcpReq.notify({
          method: "notifications/progress",
          params: { progressToken, progress: seconds - i + 1, total: seconds, message: `${i}s remaining` },
        });
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { content: [{ type: "text", text: "Blastoff!" }] };
  }
);
```

---

## 7) Managing state without sessions

**Goal:** Handle a multi-step workflow on a server that keeps no per-client state.

**Key concepts**

* No sessions, no `Mcp-Session-Id`. Every request stands alone.
* When a tool creates state worth keeping, it mints an id and returns it as ordinary result data.
* The caller passes that id back as an ordinary argument on later calls, exactly like any REST resource id.
* The actual state lives in a plain server-side store (a `Map` for local dev, a database or cache in production), keyed by that id.

**Why this pattern**

* **Any instance answers any request**: the id, not a sticky connection, is what identifies the state.
* **Resource management**: nothing to clean up on disconnect, state lives independently of the transport.
* **Scalability**: horizontal scaling with no session affinity.

**Code**

```ts
interface Task { label: string; progress: number; notes: string[] }
const tasks = new Map<string, Task>();

server.registerTool(
  "start-task",
  { title: "Start Task", description: "Start a task", inputSchema: z.object({ label: z.string() }) },
  async ({ label }) => {
    const taskId = crypto.randomUUID();
    tasks.set(taskId, { label, progress: 0, notes: [] });
    return { content: [{ type: "text", text: `Started task "${label}" with id ${taskId}` }] };
  }
);

server.registerTool(
  "advance-task",
  {
    title: "Advance Task",
    description: "Add a note and advance a task's progress",
    inputSchema: z.object({ taskId: z.string(), note: z.string() }),
  },
  async ({ taskId, note }) => {
    const task = tasks.get(taskId);
    if (!task) return { content: [{ type: "text", text: `No task found with id "${taskId}"` }], isError: true };
    task.progress += 1;
    task.notes.push(note);
    return { content: [{ type: "text", text: `Task "${task.label}" is now at progress ${task.progress}` }] };
  }
);
```

**Test scenarios**

* Connect multiple Inspector instances simultaneously.
* Start a task from each; verify progress stays independent per `taskId`.
* Call `advance-task` with a made-up id; verify a clean `isError: true` result, not a crash.

---

## 8) Validation patterns (schema + runtime)

**Goal:** Demonstrate dynamic validation and great error UX.

**Talking points**

* **Schema validation** with Zod catches type/shape issues before your handler runs.
* **Runtime/business rules** enforce constraints your schema can't express (e.g., rate limits, plan tiers, resource caps).
* Throwing a plain `Error` from a tool handler is caught by the SDK and turned into an `isError: true` result the model can read and recover from; return that shape explicitly for more control over the content.

**Enhance the same tool with validation**

```ts
server.registerTool(
  "countdown",
  {
    title: "Countdown",
    description: "Streams a countdown until blastoff (validated)",
    inputSchema: z.object({ seconds: z.number().int().positive() }),
  },
  async ({ seconds }, ctx) => {
    // Business rule: cap at 15s for demo UX
    if (seconds > 15) {
      throw new Error("'seconds' must be <= 15 for this demo");
    }
    const progressToken = ctx.mcpReq._meta?.progressToken;
    for (let i = seconds; i > 0; i--) {
      if (progressToken !== undefined) {
        await ctx.mcpReq.notify({
          method: "notifications/progress",
          params: { progressToken, progress: seconds - i + 1, total: seconds },
        });
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { content: [{ type: "text", text: "Blastoff!" }] };
  }
);
```

---

## 9) Authorization: OAuth 2.1 + PKCE for MCP

**Goal:** Secure your HTTP server as an OAuth 2.1 resource server.

**Conceptual flow**

1. Client calls without a token → server returns `401` with `WWW-Authenticate` pointing at its protected-resource metadata.
2. Client discovers the authorization server, identifies itself via a Client ID Metadata Document (CIMD) rather than registering, and runs the PKCE flow, naming your MCP server's URL as the `resource` it wants a token for.
3. Authorization server issues a token bound to that resource; the redirect back to the client carries `iss` (RFC 9207) for the client to validate.
4. Client presents the token on every `/mcp` request via `Authorization: Bearer <token>`.
5. Server verifies signature, issuer, and audience (does this token's `resource` match me?) on each request independently, no session involved.

**Server hooks**

* `requireBearerAuth` middleware in front of `/mcp`, verifying the token and rejecting with `401` + `WWW-Authenticate` on failure.
* Map scopes → tool allowlist; pass verified identity into `ctx.http.authInfo`.

**Demo idea**

* Protect the `slugify` tool; run the full CIMD → consent → token → authenticated call sequence live.

---

## 10) Tips & gotchas

* **Hosting:** Node 20+ on Fly/Render/Vercel functions or a container on k8s. Stateless by default, so no sticky sessions to configure.
* **State:** Any cross-call state is an explicit id in a server-side store, not a session, keep that store bounded and evict on your own schedule.
* **DNS rebinding:** validate `Host` and `Origin` on every request; `createMcpExpressApp` does this for you on a localhost bind.
* **Logging:** Never write non-MCP data to stdout for stdio servers; use stderr or structured logs for HTTP.
* **Headers:** real HTTP requests need `MCP-Protocol-Version`, `Mcp-Method`, and a `_meta` envelope in the body. SDK clients (VS Code, Inspector) send these for you; a hand-rolled `curl` request needs them spelled out or it silently negotiates down to legacy behavior.
* **Testing:** Integrate Inspector into CI (smoke test tools, resources, prompts).

---

## 11) Conclusion

* You learned:

  * What MCP is and how agents use it.
  * Built a Node stdio server.
  * Upgraded to a stateless Streamable HTTP service.
  * Managed multi-step state without sessions.
  * Secured it with OAuth 2.1 + PKCE, CIMD, and resource-bound tokens.
* **Next steps:**

  * Add real tools (Jira/Confluence, GitHub, databases).
  * Ship observability (request IDs, timing, error taxonomies).
  * Explore **Resources** and **Elicitation** for richer clients.

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
    "@modelcontextprotocol/server": "^2.0.0",
    "@modelcontextprotocol/express": "^2.0.0",
    "@modelcontextprotocol/node": "^2.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": { "tsx": "^4.0.0", "typescript": "^5.6.0" }
}
```

**Inspector one-liners**

* `npx @modelcontextprotocol/inspector npx tsx src/stdio-server.ts` (stdio)
* `npx @modelcontextprotocol/inspector` then connect to `http://localhost:3000/mcp` via Streamable HTTP (HTTP)

**Token plumbing during demos**
