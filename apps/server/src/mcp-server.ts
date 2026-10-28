import express from 'express';
// Using plain Express app without SDK helper
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { mcpTools } from './mcp-tools.js';

const MCP_PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 4001; // Prefer 4001 if available

const getServer = () => {
  const server = new McpServer({
    name: 'homerelay-mcp',
    version: '0.1.0',
  }, {
    capabilities: { logging: {} },
  });

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
};

const app = express();
app.use(express.raw({ type: '*/*' })); // Capture raw request body for MCP

app.post('/mcp', async (req, res) => {
  console.log('Received MCP request body:', req.body);
  const server = getServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const rawBody = req.body?.toString();
    await transport.handleRequest(req, res, rawBody);
    res.on('close', () => {
      console.log('MCP request closed');
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  console.log('Received GET MCP request (stateless mode - not supported)');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed. Use POST for stateless Streamable HTTP.',
    },
    id: null,
  }));
});

app.delete('/mcp', async (req, res) => {
  console.log('Received DELETE MCP request (stateless mode - not supported)');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed. Use POST for stateless Streamable HTTP.',
    },
    id: null,
  }));
});

app.listen(MCP_PORT, () => {
  console.log('MCP Streamable HTTP Server listening on port ' + MCP_PORT);
});

process.on('SIGINT', async () => {
  console.log('Shutting down MCP server...');
  process.exit(0);
});
