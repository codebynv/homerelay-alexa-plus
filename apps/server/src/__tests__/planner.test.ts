// apps/server/src/__tests__/planner.test.ts
import { parseRequest, generatePlan } from '../planner.js';
import { checkPantry, generateShoppingList, assignErrand, createReminder } from '../tools.js';
import type { PantryData, MembersData, Preferences } from '../types.js';

describe('Planner and Business Tools', () => {
  const mockPantry: PantryData = {
    items: [
      { name: 'pasta', quantity: 2, unit: 'boxes' },
      { name: 'garlic', quantity: 1, unit: 'bulb' },
      { name: 'olive oil', quantity: 1, unit: 'bottle' },
    ],
  };

  const mockMembers: MembersData = {
    members: [
      { id: '1', name: 'Alice', role: 'Organizer' },
      { id: '2', name: 'Bob', role: 'Shopper' },
    ],
  };

  const mockPreferences: Preferences = {
    budget: 50,
    dietaryRestrictions: ['vegetarian'],
    preferredCuisines: ['italian'],
  };

  describe('parseRequest', () => {
    it('parses natural language request with guest count, budget, and cuisine', () => {
      const parsed = parseRequest('plan italian dinner for 6 guests under $40');
      expect(parsed.intent).toBe('plan_dinner');
      expect(parsed.guestCount).toBe(6);
      expect(parsed.budget).toBe(40);
      expect(parsed.cuisine).toBe('italian');
    });

    it('returns default guest count and budget when not specified', () => {
      const parsed = parseRequest('cook dinner for the family');
      expect(parsed.intent).toBe('plan_dinner');
      expect(parsed.guestCount).toBe(4);
      expect(parsed.budget).toBe(50);
      expect(parsed.cuisine).toBeUndefined();
    });

    it('returns unknown intent for unrelated input', () => {
      const parsed = parseRequest('what is the weather today?');
      expect(parsed.intent).toBe('unknown');
    });
  });

  describe('generatePlan', () => {
    it('creates a deterministic multi-step plan for valid dinner request', () => {
      const parsed = parseRequest('plan italian dinner for 4 guests under $45');
      const plan = generatePlan(parsed, mockPantry, mockMembers, mockPreferences);

      expect(plan.requestId).toBeDefined();
      expect(plan.steps.length).toBeGreaterThanOrEqual(3);

      const tools = plan.steps.map((s) => s.tool);
      expect(tools).toContain('check_pantry');
      expect(tools).toContain('generate_shopping_list');
      expect(tools).toContain('assign_errand');
      expect(tools).toContain('create_reminder');
    });

    it('returns empty steps for unknown intent', () => {
      const parsed = { intent: 'unknown' as const };
      const plan = generatePlan(parsed, mockPantry, mockMembers, mockPreferences);
      expect(plan.steps).toEqual([]);
    });
  });

  describe('tools', () => {
    it('checkPantry identifies available and missing ingredients correctly', async () => {
      const result = await checkPantry(['pasta', 'garlic', 'basil']);
      expect(result.available).toContain('pasta');
      expect(result.available).toContain('garlic');
      expect(result.missing).toContain('basil');
    });

    it('generateShoppingList calculates costs within budget', async () => {
      const result = await generateShoppingList(['tomato', 'onion'], 30);
      expect(result.list.length).toBe(2);
      expect(result.totalCost).toBeLessThanOrEqual(30);
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it('generateShoppingList throws when total exceeds budget', async () => {
      await expect(
        generateShoppingList(['chicken breast', 'olive oil', 'cheese'], 5)
      ).rejects.toThrow(/exceeds budget/);
    });

    it('assignErrand selects an available household member', async () => {
      const result = await assignErrand(['milk', 'eggs'], ['Alice', 'Bob']);
      expect(['Alice', 'Bob']).toContain(result.assignment.member);
      expect(result.assignment.items).toEqual(['milk', 'eggs']);
    });

    it('createReminder generates a unique reminder ID', async () => {
      const result = await createReminder(new Date().toISOString(), 'Dinner Party');
      expect(result.reminderId).toMatch(/^rem-/);
    });
  });
});
