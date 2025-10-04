CP NOTES: We need to do the following (this is likely not a complete list):

- Install @modelcontextprotocol/sdk and zod
- Explain stdio and how to debug it.
- Explain what ZOD is 
- Question: Should we put the tools in a seperate file from the code that connects the transport (`await server.connect(transport)`)? This way, we have STDIO and HTTP supported at the same time. We will need to tell people to create this file.
- We should tell people about how to package these STDIO scripts up `npx` projects and what they look like to share.  Ideally linking to an article or something else that shows how to do this.  We shouldn't give detailed instructions here, just let people know that it's possible.
- They will test with just VSCode at this point. 

