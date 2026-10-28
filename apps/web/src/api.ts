// API client for HomeRelay Express server & MCP endpoints
// Automatically connects to local backend when accessed locally, or remote tunnel when deployed
const isLocal = typeof window !== "undefined" && (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");
const API_BASE = isLocal
  ? "http://127.0.0.1:4000"
  : (import.meta.env.VITE_API_BASE || "https://packet-header-eggs-investor.trycloudflare.com");

export interface PantryItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface PantryResponse {
  items: PantryItem[];
}

export interface Member {
  id: string;
  name: string;
  role: string;
}

export interface MembersResponse {
  members: Member[];
}

export interface PreferencesResponse {
  budget: number;
  dietaryRestrictions: string[];
  preferredCuisines: string[];
}

export interface PlanStep {
  tool: string;
  input: unknown;
  description: string;
}

export interface Plan {
  steps: PlanStep[];
  requestId: string;
}

export interface PlanResponse {
  plan: Plan;
}

export interface ExecuteRequest {
  plan: Plan;
  requestId: string;
}

export interface ExecuteResult {
  tool: string;
  result: unknown;
  status: "success" | "error";
}

export interface ExecuteResponse {
  results: ExecuteResult[];
}

export interface ActionLogEntry {
  timestamp: string;
  tool: string;
  input: unknown;
  result: unknown;
  status: "success" | "error";
  requestId?: string;
}

export interface LogResponse {
  entries: ActionLogEntry[];
}

// HTTP fetch helper for REST endpoints
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.details || `HTTP ${response.status}`);
  }
  return response.json();
}

// Standard REST API endpoints served by the Express backend
export async function getPantry(): Promise<PantryResponse> {
  return fetchJson<PantryResponse>(`${API_BASE}/api/pantry`);
}

export async function getMembers(): Promise<MembersResponse> {
  return fetchJson<MembersResponse>(`${API_BASE}/api/members`);
}

export async function getPreferences(): Promise<PreferencesResponse> {
  return fetchJson<PreferencesResponse>(`${API_BASE}/api/preferences`);
}

export async function getActionLog(): Promise<LogResponse> {
  return fetchJson<LogResponse>(`${API_BASE}/api/log`);
}

export async function createPlan(request: string): Promise<PlanResponse> {
  return fetchJson<PlanResponse>(`${API_BASE}/api/plan`, {
    method: "POST",
    body: JSON.stringify({ request }),
  });
}

export async function executePlan(request: ExecuteRequest): Promise<ExecuteResponse> {
  return fetchJson<ExecuteResponse>(`${API_BASE}/api/execute`, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function checkHealth(): Promise<{ status: string }> {
  return fetchJson<{ status: string }>(`${API_BASE}/health`);
}

// Standard Model Context Protocol (MCP) Streamable HTTP JSON-RPC client
export interface McpToolCallResult {
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

let mcpRpcId = 1;

/**
 * Invoke a registered tool directly on an MCP endpoint using standard JSON-RPC 2.0 (tools/call).
 * Compatible with both the local MCP server (/mcp) and the deployed AWS Lambda MCP API Gateway.
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown> = {},
  mcpEndpointUrl: string = `${API_BASE}/mcp`
): Promise<McpToolCallResult> {
  const req = {
    jsonrpc: "2.0" as const,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
    id: mcpRpcId++,
  };

  const response = await fetch(mcpEndpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MCP HTTP error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`MCP RPC error ${data.error.code}: ${data.error.message}`);
  }

  return data.result as McpToolCallResult;
}