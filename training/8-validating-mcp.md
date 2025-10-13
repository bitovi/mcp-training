# Validation Patterns: Schema + Runtime Rules

## Introduction

By the end of this step, you will understand how to implement robust validation in your MCP tools using both schema validation and runtime business rules. You'll learn how to provide clear, user-facing error messages and handle validation failures gracefully.

While Zod schema validation catches type and structure issues at the input level, many real-world applications require additional business logic validation that schemas alone cannot express. This includes rate limits, resource caps, user permissions, plan tier restrictions, and domain-specific constraints.

## Problem

Your current MCP tools only perform basic schema validation:

- **Schema validation only**: Zod catches type/shape issues but can't enforce business rules
- **No runtime constraints**: Can't validate against dynamic conditions or limits
- **Poor error messages**: Generic validation errors don't help users understand what went wrong
- **No business logic**: No way to enforce rate limits, caps, or conditional validation
- **Missing context**: Validation doesn't consider user permissions or plan tiers

Your task is to enhance the countdown tool with business rule validation that caps the maximum countdown duration while providing clear, helpful error messages to users.

## What you need to know

### Schema Validation with Zod

**[Zod](https://zod.dev/)** is a TypeScript-first schema validation library that the MCP SDK uses for input validation:

```typescript
import { z } from "zod";

// Basic types
z.string(); // string
z.number(); // number
z.boolean(); // boolean
z.array(z.string()); // string[]

// Constraints
z.string().min(1).max(100); // Length constraints
z.number().int().positive(); // Integer constraints
z.number().min(0).max(100); // Range constraints
z.string().email(); // Format validation
z.string().regex(/^[a-z]+$/); // Pattern matching

// Required vs Optional
z.object({
  name: z.string(), // Required by default
  email: z.string().email().optional(), // Optional field
  age: z.number().default(0), // Required with default value
});
```

**MCP Input Schema Pattern:**

```typescript
inputSchema: {
  seconds: z.number()
    .int("Must be a whole number")
    .positive("Must be greater than 0")
    .describe("Number of seconds to count down from");
}
```

**Key Zod Methods:**

- **`.describe()`**: Adds documentation for the field (shows in MCP Inspector)
- **`.optional()`**: Makes the field optional
- **`.default(value)`**: Provides a default value if field is missing
- **Custom error messages**: Pass error message as parameter to constraints

<!-- ? why not just provide the default in only the typescript function? This would cause confusion if someone updates only 1 of the 2... -->

**Note on defaults**: While Zod's `.default()` provides the default value, you should also add a TypeScript default in your function parameter destructuring for type safety:

```typescript
// Zod schema with default
message: z.string().default("🚀 Blastoff!").optional()

// TypeScript function with matching default
async ({ seconds, message = "🚀 Blastoff!" }, extra) => {
```

### Runtime/Business Rule Validation

**Purpose**: Enforce business logic that Zod schemas cannot express:

```typescript
async ({ seconds }, extra) => {
  // Schema validation already passed - seconds is a positive integer

  // Business rule validation
  if (seconds > 15) {
    throw new Error(
      "Countdown duration must be 15 seconds or less for this demo"
    );
  }

  // Additional business rules
  if (seconds > userPlan.maxCountdown) {
    throw new Error(
      `Your plan allows countdowns up to ${userPlan.maxCountdown} seconds`
    );
  }

  // Tool logic continues...
};
```

### MCP Error Types and Handling

<!-- broken link. maybe https://modelcontextprotocol.io/docs/learn/server-concepts? -->

The **[MCP SDK](https://modelcontextprotocol.io/docs/api/server)** provides specific error types for different scenarios:

**Basic Errors (what we'll use):**

```typescript
// Simple error with user-friendly message
throw new Error("Countdown duration must be 15 seconds or less");
```

**Advanced MCP Error Types:**

```typescript
import {
  InvalidTokenError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from "@modelcontextprotocol/sdk/types.js";

// Authentication issues
throw new InvalidTokenError("Token has expired");
throw new AuthenticationError("Invalid credentials");

// Authorization issues
throw new AuthorizationError("Insufficient permissions for this operation");

// Validation issues
throw new ValidationError("Invalid input parameters");
```

**When to use specific error types:**

- **`Error`**: General business rule violations, user-facing messages
- **`ValidationError`**: Schema or input validation failures
- **`AuthenticationError`**: Authentication failures (invalid tokens, expired sessions)
- **`AuthorizationError`**: Permission denied, insufficient scopes
- **`InvalidTokenError`**: Specific token validation issues

**Error Handling Best Practices:**

```typescript
// ❌ Poor error message
throw new Error("Invalid input");

// ✅ Clear, actionable error message
throw new Error(
  "Countdown duration must be 15 seconds or less. You entered 30 seconds."
);

// ✅ Error with context and suggestions
if (seconds > maxAllowed) {
  throw new Error(
    `Countdown duration of ${seconds} seconds exceeds the maximum allowed limit of ${maxAllowed} seconds. ` +
      `Please enter a value between 1 and ${maxAllowed} seconds.`
  );
}
```

### Complete Validation Flow

**Validation happens in layers:**

1. **Schema validation**: Zod validates input structure and types automatically
2. **Tool handler execution**: Your async function runs
3. **Business rule validation**: Check constraints in your tool logic
4. **Tool execution**: Perform the actual work if validation passes
5. **Error handling**: MCP client receives clear messages if validation fails

### Advanced Zod Patterns

**Complex validation with Zod:**

```typescript
inputSchema: {
  // Required field with constraints
  seconds: z.number()
    .int("Must be a whole number")
    .positive("Must be greater than 0")
    .max(60, "Cannot exceed 60 seconds")
    .describe("Number of seconds to count down from"),

  // Optional field with default
  message: z.string()
    .min(1, "Message cannot be empty")
    .max(100, "Message too long")
    .default("Ready!")
    .describe("Custom message to display")
    .optional(),

  // Required field (explicit) - usually not needed
  userId: z.string()
    .min(1, "User ID is required")
    .describe("User identifier")
    // Fields are required by default in Zod objects
    // .required() only needed when making optional fields required again
}
```

**When to use Zod vs Runtime validation:**

- **Zod**: Static constraints that don't depend on external state
- **Runtime**: Dynamic constraints, business logic, external API checks, user permissions

### Validation Testing Patterns

**Test both validation layers:**

```typescript
// Schema validation tests
seconds: "10"    → ❌ Zod error (string instead of number)
seconds: -5      → ❌ Zod error (negative number)
seconds: 2.5     → ❌ Zod error (not integer)

// Business rule tests
seconds: 16      → ❌ Runtime error (exceeds limit)
seconds: 15      → ✅ Valid (at limit)
seconds: 10      → ✅ Valid
```

## Technical Requirements

✏️ **Enhance your countdown tool with business rule validation**:

1. **Update existing schema validation** with Zod for basic type checking
2. **Add runtime business rule** that limits countdown to 15 seconds maximum
3. **Use clear error messages** that explain the limit and what the user entered
4. **Test both valid and invalid inputs** to ensure validation works correctly
5. **Maintain streaming functionality** for valid inputs

**Expected validation logic:**

- Schema validation: Ensure `seconds` is a positive integer (required by default)
- Business rule: Reject any countdown > 15 seconds with helpful error message
- Error format: Clear, user-facing message that explains the constraint
<!-- should we not add that success message must be a non-empty string? since it's part of the -->

**File to modify:** Update your existing `src/mcp-server.ts` countdown tool

## How to verify your solution

✏️ **Test valid inputs**:

1. **Start your HTTP server**:

   ```bash
   npm run dev:http
   ```

2. **Connect with MCP Inspector**:

   ```bash
   npx @modelcontextprotocol/inspector
   ```

3. **Test valid countdown values**:

   - Try `seconds: 5` - should work normally with default "🚀 Blastoff!" message
   - Try `seconds: 15` - should work (at the limit)
   - Try `seconds: 1` - should work (minimum valid)
   - Try `seconds: 5, message: "Done!"` - should work with custom message
   - Try `seconds: 10, message: "Mission Complete!"` - should work with custom message

4. **Verify streaming still works** for valid inputs

✏️ **Test invalid inputs**:

1. **Test business rule validation**:

   - Try `seconds: 16` - should fail with clear error message
   - Try `seconds: 30` - should fail with clear error message
   - Try `seconds: 100` - should fail with clear error message

2. **Test schema validation**:

   - Try `seconds: -5` - should fail (negative number)
   - Try `seconds: 2.5` - should fail (not an integer)
   - Try `seconds: "10"` - should fail (string instead of number)
   - Try `seconds: 5, message: ""` - should fail (empty message not allowed)
   - Try `seconds: 5, message: 123` - should fail (message must be string)

3. **Verify error messages are helpful**:
   - Check that errors explain the 15-second limit
   - Confirm errors mention what value was actually provided
   - Ensure errors are user-friendly, not technical

✏️ **Test in VS Code**:

1. **Test in VS Code Copilot Chat**:

   - Ask: "Use the countdown tool to count down from 10 seconds" (should work with default message)
   - Ask: "Use the countdown tool to count down from 20 seconds" (should fail with clear error)
   - Ask: "Use the countdown tool to count down from 5 seconds with message 'Ready to go!'" (should work with custom message)

2. **Observe error handling**: VS Code should display the validation error clearly

💡 **Expected behaviors**:

- **Valid inputs (1-15 seconds)**: Tool executes normally with streaming progress
- **Invalid inputs (>15 seconds)**: Clear error message explaining the limit
- **Schema violations**: Zod error messages for type/structure issues
- **Consistent behavior**: Same validation in both MCP Inspector and VS Code

⚠️ **Troubleshooting tips**:

- If validation isn't working, check that you're throwing errors in the tool handler
- Ensure error messages are strings, not complex objects
- Test both schema and business rule validation separately
- Check server console for any unexpected errors during validation

## Solution

Here's the enhanced countdown tool with business rule validation, showing the key changes from the streaming implementation:

### Enhanced MCP Server with Validation

The main transformation from Step 6 (streaming) to Step 8 (validation) involves adding schema constraints and business rule validation:

**src/mcp-server.ts** - Key changes from streaming to validation-enhanced:

```diff
  // Register the streaming countdown tool
  server.registerTool(
    "countdown",
    {
      title: "Countdown Timer",
      description: "Counts down from a number with real-time progress updates",
      inputSchema: {
-        seconds: z.number().describe("Number of seconds to count down from")
+        seconds: z.number()
+          .int("Must be a whole number")
+          .positive("Must be greater than 0")
+          .describe("Number of seconds to count down from"),
+        message: z.string()
+          .min(1, "Message cannot be empty")
+          .default("🚀 Blastoff!")
+          .describe("Custom message to display when countdown completes")
+          .optional()
      }
    },
-    async ({ seconds }, extra) => {
+    async ({ seconds, message = "🚀 Blastoff!" }, extra) => {
+      // Business rule validation: cap at 15 seconds for demo
+      if (seconds > 15) {
+        throw new Error(`Countdown duration must be 15 seconds or less for this demo. You entered ${seconds} seconds.`);
+      }
+
      // Stream countdown progress with dual notification patterns
      for (let i = seconds; i > 0; i--) {
        // 1. Logging notification (for MCP Inspector debugging)
        await extra.sendNotification({
          method: "notifications/message",
          params: {
            level: "info",
            data: `Countdown: ${i} seconds remaining`
          }
        });

        // 2. Progress notification (when VS Code provides progressToken)
        if (extra._meta?.progressToken) {
          await extra.sendNotification({
            method: "notifications/progress",
            params: {
              progressToken: extra._meta.progressToken,
              progress: seconds - i + 1,  // Current step (1, 2, 3...)
              total: seconds,              // Total steps
              message: `${i} seconds remaining!`
            }
          });
        }

        // Wait 1 second before next update
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

-      // Return final result
+      // Return final result with custom or default message
      return {
        content: [{
          type: "text",
-          text: "🚀 Blastoff!"
+          text: message
        }]
      };
    }
  );
```

**Key changes explained:**

1. **Enhanced Schema Validation** ([line 47-49](./8-validating-mcp/src/mcp-server.ts#L47-49)): Add `.int()` and `.positive()` constraints to `seconds` field with descriptive error messages for better user feedback

2. **Optional Message Parameter** ([line 50-54](./8-validating-mcp/src/mcp-server.ts#L50-54)): Add customizable `message` field with validation, default value, and optional flag to allow personalized completion messages

3. **Function Parameter Destructuring** ([line 57](./8-validating-mcp/src/mcp-server.ts#L57)): Update function signature to include `message` parameter with TypeScript default matching Zod schema default

4. **Business Rule Validation** ([line 58-61](./8-validating-mcp/src/mcp-server.ts#L58-61)): Add runtime check to enforce 15-second limit with clear, user-friendly error message that includes the actual input value

5. **Dynamic Result Message** ([line 95-99](./8-validating-mcp/src/mcp-server.ts#L95-99)): Replace hardcoded "🚀 Blastoff!" with dynamic `message` parameter to support custom completion messages

This implementation demonstrates the layered validation approach: Zod schema validation for type safety and constraints, followed by business rule validation for domain-specific limits, all with clear user-facing error messages.

**Complete implementation**: See [src/mcp-server.ts](./8-validating-mcp/src/mcp-server.ts) for the full validation-enhanced MCP server code.

### Key Implementation Details

1. **Schema validation**: Zod ensures `seconds` is a positive integer
2. **Business rule validation**: Runtime check limits countdown to 15 seconds
3. **Clear error messages**: User-friendly message explains the constraint and actual value
4. **Error placement**: Business rule check happens after schema validation but before tool logic
5. **Streaming preservation**: Valid inputs still get full streaming countdown functionality

### Testing the Implementation

**Valid inputs (should work)**:

```
seconds: 1                               → ✅ Works with default message
seconds: 15                              → ✅ Works (at limit)
seconds: 10, message: "Mission Complete!" → ✅ Works with custom message
```

**Invalid inputs (should fail with clear errors)**:

```
seconds: 16                     → ❌ "Countdown duration must be 15 seconds or less..."
seconds: 30                     → ❌ "Countdown duration must be 15 seconds or less..."
seconds: -1                     → ❌ Zod schema error
seconds: "5"                    → ❌ Zod schema error
seconds: 5, message: ""         → ❌ Zod schema error (empty message)
seconds: 5, message: 123        → ❌ Zod schema error (message must be string)
```

This implementation demonstrates the layered validation approach: schema validation for structure/types, followed by business rule validation for domain-specific constraints, both with clear user-facing error messages.

## Next Steps

Your MCP server is robust and well-validated, but it's still wide open to the world. Time to add proper authentication and authorization!

**Continue to:** [Step 9 - Authorizing MCP Services with OAuth 2.1 + PKCE](9-authorizing-mcp.md)

In the final step, you'll implement OAuth 2.1 with PKCE to secure your MCP server and make it production-ready with proper authentication and authorization.
