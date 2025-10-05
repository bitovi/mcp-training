#!/usr/bin/env node --import ../../loader.mjs

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema, LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";

// Test configuration
const SERVER_URL = "http://localhost:3000/mcp";
const NUM_AGENTS = 3;
const COUNTDOWN_SECONDS = 10;

interface Agent {
  id: string;
  client: Client;
  transport: StreamableHTTPClientTransport;
  notifications: string[];
  connected: boolean;
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
    transport: new StreamableHTTPClientTransport(new URL(SERVER_URL)),
    notifications: [],
    connected: false,
    errors: []
  };

  // Set up error handling
  agent.client.onerror = (error) => {
    console.log(`❌ Agent ${agentId} error:`, error.message);
    agent.errors.push(error);
  };

  // Set up notification handling
  agent.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
    const message = `${notification.params.data}`;
    agent.notifications.push(message);
    console.log(`📬 Agent ${agentId} received: ${message}`);
  });

  try {
    // Connect to the server
    await agent.client.connect(agent.transport);
    agent.connected = true;
    console.log(`✅ Agent ${agentId} connected! Session ID: ${agent.transport.sessionId || 'none'}`);
  } catch (error) {
    console.log(`❌ Agent ${agentId} failed to connect:`, error);
    agent.errors.push(error as Error);
  }

  return agent;
}

async function testCountdown(agent: Agent): Promise<void> {
  if (!agent.connected) {
    console.log(`⏭️  Skipping countdown for agent ${agent.id} (not connected)`);
    return;
  }

  try {
    console.log(`⏰ Agent ${agent.id} starting countdown...`);
    
    const result = await agent.client.request({
      method: "tools/call",
      params: {
        name: "countdown",
        arguments: { seconds: COUNTDOWN_SECONDS }
      }
    }, CallToolResultSchema);

    console.log(`🎉 Agent ${agent.id} countdown completed:`, result.content[0]);
  } catch (error) {
    console.log(`💥 Agent ${agent.id} countdown failed:`, error);
    agent.errors.push(error as Error);
  }
}

async function runTest(): Promise<void> {
  console.log(`🚀 Testing ${NUM_AGENTS} simultaneous MCP agents`);
  console.log(`🎯 Server: ${SERVER_URL}`);
  console.log(`⏱️  Countdown duration: ${COUNTDOWN_SECONDS} seconds`);
  console.log('='.repeat(50));

  // Create all agents
  const agents: Agent[] = [];
  for (let i = 1; i <= NUM_AGENTS; i++) {
    const agent = await createAgent(`Agent-${i}`);
    agents.push(agent);
    
    // Small delay between connections to see ordering
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 Connection Summary:');
  agents.forEach(agent => {
    console.log(`  ${agent.id}: ${agent.connected ? '✅ Connected' : '❌ Failed'} (${agent.errors.length} errors)`);
  });

  // Test simultaneous countdowns
  console.log('\n🏁 Starting simultaneous countdowns...');
  const countdownPromises = agents.map(agent => testCountdown(agent));
  
  // Wait for all countdowns to complete
  await Promise.allSettled(countdownPromises);

  // Report results
  console.log('\n📈 Final Results:');
  agents.forEach(agent => {
    console.log(`\n${agent.id}:`);
    console.log(`  Connected: ${agent.connected}`);
    console.log(`  Session ID: ${agent.transport.sessionId || 'none'}`);
    console.log(`  Notifications received: ${agent.notifications.length}`);
    console.log(`  Errors: ${agent.errors.length}`);
    
    if (agent.errors.length > 0) {
      console.log(`  Error details:`);
      agent.errors.forEach((error, i) => {
        console.log(`    ${i + 1}. ${error.message}`);
      });
    }
  });

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await Promise.allSettled(agents.map(async (agent) => {
    try {
      if (agent.connected) {
        await agent.transport.close();
        console.log(`✅ Agent ${agent.id} disconnected`);
      }
    } catch (error) {
      console.log(`⚠️  Agent ${agent.id} cleanup error:`, error);
    }
  }));

  console.log('\n✨ Test complete!');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted. Exiting...');
  process.exit(0);
});

// Run the test
runTest().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});