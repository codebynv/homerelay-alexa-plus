export interface PantryItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface PantryData {
  items: PantryItem[];
}

export interface Member {
  id: string;
  name: string;
  role: string;
}

export interface MembersData {
  members: Member[];
}

export interface Preferences {
  budget: number;
  dietaryRestrictions: string[];
  preferredCuisines: string[];
}

export interface ShoppingListItem {
  item: string;
  cost: number;
}

export interface ShoppingList {
  list: ShoppingListItem[];
  totalCost: number;
}

export interface ErrandAssignment {
  assignment: {
    member: string;
    items: string[];
  };
}

export interface Reminder {
  reminderId: string;
}

export interface ActionLogEntry {
  timestamp: string;
  tool: string;
  input: unknown;
  result: unknown;
  status: "success" | "error";
  requestId?: string;
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

export interface ExecuteRequest {
  plan: Plan;
  requestId: string;
}

export interface ExecuteResponse {
  results: Array<{
    tool: string;
    result: unknown;
    status: "success" | "error";
  }>;
}