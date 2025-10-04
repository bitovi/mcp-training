CP NOTES: We need to do the following (this is not a complete list):

- explain the different type of "events" that can be transmitted
- explain what these look like to a client
- we should have minimal validation on the `seconds` input. Maybe just `z.number()` or nothing if there's a way to do it. Validation will be covered in the next step.



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