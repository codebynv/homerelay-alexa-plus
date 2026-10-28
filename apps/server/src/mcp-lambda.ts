// apps/server/src/mcp-lambda.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createMcpServer } from './mcp-setup.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

/**
 * Lambda handler for the MCP endpoint.
 * It builds a Web‑Standard request from the API‑Gateway event and delegates to
 * the SDK's `WebStandardStreamableHTTPServerTransport`. The transport processes
 * the JSON‑RPC payload and returns a standard `Response` which we translate back
 * to the shape expected by API Gateway.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Support both API Gateway REST (v1) and HTTP API (v2) event payloads:
  const method = (event as any).requestContext?.http?.method ?? event.httpMethod ?? 'POST';
  const path = (event as any).rawPath ?? event.path ?? '/mcp';
  const host = event.headers?.host ?? (event as any).requestContext?.domainName ?? 'localhost';
  const url = `https://${host}${path}`;

  // API Gateway may base64‑encode the body when the payload is binary.
  const rawBody = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body ?? '';

  const isBodyAllowed = method !== 'GET' && method !== 'HEAD';
  const request = new Request(url, {
    method,
    // Cast headers to satisfy the Headers constructor type.
    headers: new Headers({ ...(event.headers as Record<string,string>), 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' }),
    // Only pass body if HTTP method allows it (GET/HEAD with body throws in standard Request)
    body: isBodyAllowed ? (rawBody || undefined) : undefined,
  });

  // Create a fresh MCP server instance with all tools registered.
  const server = createMcpServer();

  const transport = new WebStandardStreamableHTTPServerTransport({
    // The original Express implementation uses stateless mode (no session ID).
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  console.log('Incoming request Accept header:', request.headers.get('accept'));
  // Connect the server to the transport before handling the request.
  await server.connect(transport);
  // Let the transport handle the request. It returns a Web Standard `Response`.
  const response = await transport.handleRequest(request);
  console.log('Transport response status', response.status);

  // Convert the `Response` into the shape API Gateway expects.
  const responseBody = await response.text();
  console.log('Transport response body', responseBody);
  const result: APIGatewayProxyResult = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseBody,
    isBase64Encoded: false,
  };
  return result;
};
