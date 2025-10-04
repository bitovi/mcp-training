# MCP Training Material Guidelines

## Project Overview

This project creates step-by-step training materials for building MCP (Model Context Protocol) services using Node.js and TypeScript. The training follows a practical approach from basic stdio servers to production HTTP services with OAuth 2.1.

The steps for the training can be found in `<project-root>/training/*`.

This project also includes:

- The final output of all the steps in `<project-root>/final/*`
- Initial scaffolding of the project in `<project-root>/*`. 


## Content Structure for Exercise Steps

For hands-on exercise steps, follow this structure based on Bitovi Academy format:

### Required Sections (in order):
1. **Title (H1)**: Clear, descriptive title
2. **Introduction**: Brief explanation of what the person will learn
3. **Problem (H2)**: High-level description of what problem we're solving
4. **What you need to know (H2)**: Everything needed to accomplish the task
5. **Technical Requirements (H2)**: Explicit instructions without giving away the solution
6. **How to verify your solution (H2)**: Instructions on testing the solution
7. **Solution (H2)**: The complete, exact solution

### Content Guidelines

#### What you need to know
- Include analogous example code when helpful
- For non-MCP utility code (like slug generation), provide complete implementations
- Use H3 subsections (###) when there's a lot to cover
- Focus on concepts directly relevant to MCP development

#### Technical Requirements
- Be explicit but don't reveal the final solution
- Include any necessary setup steps
- Provide clear acceptance criteria
- Include file paths and specific method names when relevant

#### Code Examples
- Use TypeScript for all MCP-related code
- Include proper imports and type annotations
- Show minimal, working examples
- For utility functions unrelated to MCP learning objectives, provide complete code:

```typescript
const slug = text
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^\w\s-]/g, "")
  .trim()
  .replace(/[\s_-]+/g, "-")
  .replace(/^-+|-+$/g, "");
```

#### Solution Section
- Provide complete, working code
- Include all necessary imports and setup
- Test the solution before including it
- Add brief explanations for key concepts

## Content Structure for Conceptual Steps

For explanatory/foundational steps (like "What is MCP?"):
1. **Title (H1)**: Clear, descriptive title  
2. **Introduction**: What the reader will learn
3. **Main content sections (H2)**: Organized by concept
4. **Subsections (H3)**: As needed for detailed topics

## Technical Standards

### MCP SDK Usage
- Use `@modelcontextprotocol/sdk` version ^1.18.0
- Prefer official SDK patterns and examples
- Keep up with transport deprecations (HTTP+SSE → Streamable HTTP)

### Dependencies
- Node.js 18+ required
- TypeScript for all examples
- Zod for schema validation

### Code Quality
- Include proper error handling
- Use clear variable names
- Add comments for complex logic
- Follow TypeScript best practices

## Training Flow Considerations

### Progressive Complexity
- Start with simple stdio servers
- Move to HTTP transport
- Add streaming capabilities
- Introduce validation and security
- End with production deployment

### Practical Examples
- Use realistic, useful tools (not just "hello world")
- Include common patterns developers will need
- Show both simple and complex scenarios
- Demonstrate proper error handling

### Testing and Verification
- Include MCP Inspector usage instructions
- Provide clear success criteria
- Show expected outputs
- Include common troubleshooting tips

## Writing Style

### Tone
- Clear and direct
- Practical and hands-on
- Assume JavaScript/TypeScript familiarity
- Explain MCP-specific concepts thoroughly

### Formatting
- Use code blocks with language specification
- Include file paths in backticks: `src/server.ts`
- Use **bold** for important concepts
- Use > blockquotes for important notes or warnings

### Emoji Usage
- ✏️ Use for actionable steps the user should take (following Bitovi Academy pattern)
- 💡 Use for tips and helpful insights
- ⚠️ Use for warnings or important cautions
- 🔍 Use for verification/testing steps
- 📝 Use for notes or additional context

### Examples
- Prefer complete, runnable examples
- Include necessary imports and setup
- Show realistic use cases
- Test all code before including

## Quality Checklist

Before completing any training step:
- [ ] All code examples are tested and working
- [ ] File paths and naming follow conventions
- [ ] Structure matches the required format
- [ ] Technical requirements are clear but not revealing
- [ ] Solution is complete and correct
- [ ] Writing is clear and concise
- [ ] MCP concepts are properly explained