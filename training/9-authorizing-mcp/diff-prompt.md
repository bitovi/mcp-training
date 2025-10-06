I'd like you to update the solution sections on training steps by generating diff documentation.

**Parameters** (optional):
- **Steps**: Specify which steps to process (e.g., "Step 5, Step 9" or "Step 6-8"). If not provided, process all steps listed below.
- **Files**: Specify which files to compare (e.g., "http-server, mcp-server"). If not provided, process all files listed for each step.

**Objective**: Show the changes necessary to complete each step's problem section by comparing implementation files between steps.

**Process**:
1. If no specific steps/files are provided, process all steps and files listed in the "Steps to Process" section below
2. Build a todo list for each step to be processed
3. For each file comparison, analyze the differences and update the solution documentation
4. Generate consistent, educational diff presentations

**File Comparison Format**:
```
### Step {number}
- {file-path} - step {comparison-step}
```

**Example**: `src/http-server - step 7` means compare step 9's `src/http-server.ts` file with step 7's `src/http-server.ts` file.

**File Locations**: 
- Current step files: `training/{current-step-name}/src/{file-path}.ts`
- Comparison step files: `training/{comparison-step-name}/src/{file-path}.ts`

**Required Output for Each File**:

1. **Section Header**: Use the format `### {number}. Update {File Description} (\`src/{file-path}.ts\`)`

2. **Context Description**: Brief explanation of what changes accomplish (1-2 sentences)

3. **Diff Block**: 
   - Use proper diff formatting with `+` for additions, `-` for deletions
   - Include 3-5 lines of context before/after changes
   - Focus on the most important changes (avoid showing entire files)
   - Use `...` to indicate omitted sections if needed

4. **Key Changes Summary**: 
   - Numbered list explaining each significant change
   - Include specific line numbers when helpful
   - Explain the purpose/benefit of each change

5. **Reference Link**: 
   - Format: `📁 **Reference Implementation**: [training/{step-name}/src/{file}.ts](training/{step-name}/src/{file}.ts#L{changed-lines})`
   - Link to specific lines that changed (e.g., `#L5,L13,L17,L25-L26`)

**Quality Guidelines**:
- Focus on educationally relevant changes (not just formatting)
- Explain the "why" behind changes, not just the "what"
- Use consistent formatting and terminology
- Keep diffs concise but complete enough to understand the changes

**Usage Examples**:
- Process all steps: Just run the prompt without specifying parameters
- Process specific steps: "Process Step 5 and Step 9"
- Process specific files: "Process only http-server files"
- Process specific combinations: "Process Step 6-8, only mcp-server and http-server files"


The result will look like:

```
### 6. Update HTTP Server (`src/http-server.ts`)

Changes to integrate OAuth into your existing HTTP server from step 7:

```diff
#!/usr/bin/env node --import ./loader.mjs
import express from 'express';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp-server.js";
+ import { addOAuthToApp } from "./auth/oauth-wrapper.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

- // Add CORS headers
+ // Add CORS headers FIRST
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
-   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
+   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

+ // Add OAuth endpoints and authentication AFTER CORS
+ addOAuthToApp(app);

// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};
```

**Key Changes:**
1. **Line 5**: Import `addOAuthToApp` from the OAuth wrapper
2. **Line 13**: Update comment to emphasize CORS comes first
3. **Line 17**: Add `WWW-Authenticate` header to CORS configuration for OAuth responses
4. **Lines 25-26**: Add OAuth endpoints and authentication middleware after CORS

📁 **Reference Implementation**: [training/9-authorizing-mcp/src/http-server.ts](training/9-authorizing-mcp/src/http-server.ts#L5,L13,L17,L25-L26)
```

## Steps to Process

*If no specific steps are provided as parameters, process all steps listed below:*

### Step 9

- http-server - step 7

