// apps/server/src/mcp-setup.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpTools } from './mcp-tools.js';

/**
 * Factory to create a new MCP server with all tools registered.
 * Used by both the local Express server and the Lambda handler.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'homerelay-mcp',
    version: '0.1.0',
  }, { capabilities: { logging: {} } });

  for (const tool of mcpTools) {
    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema.shape,
        outputSchema: tool.outputSchema.shape,
      },
      tool.handler
    );
  }

  return server;
}
