#!/usr/bin/env node --import ../../loader.mjs

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

// Verifies that multiple concurrent clients hitting the same stateless
// server each get their own independent task state, addressed purely by
// the taskId each start-task call hands back (see Step 7).

const SERVER_URL = "http://localhost:3000/mcp";
const NUM_AGENTS = 3;

interface Agent {
  id: string;
  client: Client;
  taskId?: string;
  finalProgress?: number;
  errors: Error[];
}

async function createAgent(agentId: string): Promise<Agent> {
  console.log(`🤖 Creating agent ${agentId}...`);

  const agent: Agent = {
    id: agentId,
    client: new Client({
      name: `test-agent-${agentId}`,
      version: "1.0.0"
    }),
    errors: []
  };

  try {
    await agent.client.connect(new StreamableHTTPClientTransport(new URL(SERVER_URL)));
    console.log(`✅ Agent ${agentId} connected`);
  } catch (error) {
    console.log(`❌ Agent ${agentId} failed to connect:`, error);
    agent.errors.push(error as Error);
  }

  return agent;
}

async function runTaskLifecycle(agent: Agent): Promise<void> {
  try {
    console.log(`🏁 Agent ${agent.id} starting a task...`);

    const started = await agent.client.callTool({
      name: "start-task",
      arguments: { label: `Task from ${agent.id}` }
    });

    const startText = started.content[0].type === "text" ? started.content[0].text : "";
    const taskId = startText.match(/id ([0-9a-f-]+)/)?.[1];
    agent.taskId = taskId;
    console.log(`📦 Agent ${agent.id} got taskId: ${taskId}`);

    // Advance the task twice, each agent using only its own taskId
    for (let i = 1; i <= 2; i++) {
      const advanced = await agent.client.callTool({
        name: "advance-task",
        arguments: { taskId, note: `${agent.id} note ${i}` }
      });

      const advanceText = advanced.content[0].type === "text" ? advanced.content[0].text : "";
      console.log(`📈 Agent ${agent.id}: ${advanceText}`);
      agent.finalProgress = Number(advanceText.match(/progress (\d+)/)?.[1]);
    }
  } catch (error) {
    console.log(`💥 Agent ${agent.id} task lifecycle failed:`, error);
    agent.errors.push(error as Error);
  }
}

async function runTest(): Promise<void> {
  console.log(`🚀 Testing ${NUM_AGENTS} simultaneous MCP agents`);
  console.log(`🎯 Server: ${SERVER_URL}`);
  console.log("=".repeat(50));

  const agents: Agent[] = [];
  for (let i = 1; i <= NUM_AGENTS; i++) {
    agents.push(await createAgent(`Agent-${i}`));
  }

  console.log("\n🏁 Starting simultaneous task lifecycles...");
  await Promise.allSettled(agents.map(runTaskLifecycle));

  console.log("\n📈 Final Results:");
  const taskIds = new Set<string>();
  agents.forEach(agent => {
    console.log(`\n${agent.id}:`);
    console.log(`  taskId: ${agent.taskId}`);
    console.log(`  final progress: ${agent.finalProgress}`);
    console.log(`  errors: ${agent.errors.length}`);
    if (agent.taskId) taskIds.add(agent.taskId);
  });

  const allIndependent = taskIds.size === agents.length && agents.every(a => a.finalProgress === 2);
  console.log(
    allIndependent
      ? "\n✨ Every agent's task stayed independent (unique taskId, progress reached 2)."
      : "\n⚠️  Tasks did not stay independent, check for shared state between agents."
  );

  console.log("\n🧹 Cleaning up...");
  await Promise.allSettled(agents.map(agent => agent.client.close()));
}

process.on("SIGINT", () => {
  console.log("\n\n🛑 Test interrupted. Exiting...");
  process.exit(0);
});

runTest().catch(error => {
  console.error("💥 Test failed:", error);
  process.exit(1);
});
