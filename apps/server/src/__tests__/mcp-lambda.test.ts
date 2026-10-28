// apps/server/src/__tests__/mcp-lambda.test.ts
import { handler } from '../mcp-lambda.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

describe('MCP Lambda handler', () => {
  it('processes a valid check_pantry JSON-RPC request', async () => {
    const requestBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'check_pantry', arguments: { ingredients: ['milk'] } },
      id: 1,
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/mcp',
      headers: { host: 'example.com' },
      body: requestBody,
      isBase64Encoded: false,
      // Minimal required fields for the type
      resource: '',
      requestContext: {} as any,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      multiValueHeaders: {},
      stage: undefined,
      requestId: undefined,
      identity: undefined,
    } as any;

    const result = await handler(event);
    expect(result.statusCode).toBe(200);
    const payload = JSON.parse(result.body);
    expect(payload.jsonrpc).toBe('2.0');
    expect(payload.id).toBe(1);
    // Result should contain content array from the tool handler
    expect(payload.result).toBeDefined();
  });

  it('processes a valid check_pantry request from API Gateway HTTP API (payload format 2.0)', async () => {
    const requestBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'check_pantry', arguments: { ingredients: ['chicken breast'] } },
      id: 2,
    });

    const eventV2 = {
      version: '2.0',
      routeKey: 'POST /mcp',
      rawPath: '/prod/mcp',
      headers: { host: 'example.execute-api.us-east-1.amazonaws.com' },
      requestContext: {
        http: {
          method: 'POST',
          path: '/prod/mcp',
        },
      },
      body: requestBody,
      isBase64Encoded: false,
    } as any;

    const result = await handler(eventV2);
    expect(result.statusCode).toBe(200);
    const payload = JSON.parse(result.body);
    expect(payload.jsonrpc).toBe('2.0');
    expect(payload.id).toBe(2);
    expect(payload.result).toBeDefined();
  });
});
