// ──────────────────────────────────────────────
// Deliveries API Routes (including AI planning)
// ──────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import {
  getAllPanels,
  getDeliveryByDay,
  getAllDeliveries,
  getStacks,
  setStacks,
  getProjectInfo,
} from '../data/db.js';

const router = Router();

// ── Zod schema for structured AI output ──────
const StackSchema = z.object({
  id: z.string().describe('Unique stack ID, e.g. STACK-01'),
  delivery_day: z.number().describe('Delivery day number'),
  total_weight_kg: z
    .number()
    .describe('Total weight of all panels in this stack in kg'),
  target_zone: z
    .string()
    .describe('Primary zone where these panels will be installed'),
  panelIds: z
    .array(z.string())
    .describe(
      'Array of Panel IDs in STRICT LIFO order — first element is the FIRST panel the framer needs (top of stack)'
    ),
});

const CommandResponseSchema = z.object({
  type: z
    .enum(['plan_update', 'conversational'])
    .describe('Set to "plan_update" if the PM is requesting a new delivery plan or constraint re-calculation. Set to "conversational" if they are asking a question, requesting info, or making a comment without asking to change the delivery plan.'),
  stacks: z
    .array(StackSchema)
    .optional()
    .describe('Array of planned delivery stacks (required if type is "plan_update")'),
  reasoning: z
    .string()
    .describe('If type is "plan_update", explain how the plan was generated. If type is "conversational", provide the direct conversational response to the PM\'s question or comment.'),
});

// POST /api/deliveries/ai-plan — AI-powered delivery planning & assistance
router.post('/ai-plan', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      res.status(400).json({ error: 'A "command" string is required.' });
      return;
    }

    const currentPanels = getAllPanels();
    const activePanels = currentPanels.filter(
      (p) => p.status === 'pending' || p.status === 'stacked'
    );
    const project = getProjectInfo();

    const systemPrompt = `You are the AUAR Delivery Assistant. You help a Production Manager (PM) manage modular timber-panel deliveries.

PROJECT: ${project.name} — ${project.site_address}

THE ROLE:
1. If the PM asks to plan or re-plan deliveries (e.g., "re-plan", "plan day 1", "limit weight", "truck broke down"), set type to "plan_update", generate the new stacks containing only the active panels, and provide the explanation in reasoning.
2. If the PM asks a question, requests information (e.g., "what panels are damaged?", "which panels are in stack 1?", "are there any damaged panels?"), or makes a comment, set type to "conversational", leave stacks empty/omitted, and write your direct answer to their question in reasoning.

STRICT RULES YOU MUST ALWAYS ENFORCE FOR PLAN UPDATES:
1. THE SEQUENCE RULE: Panels have an install_sequence number. Within each stack, panels MUST be ordered by install_sequence. This order is absolute and dictated by structural engineering — you cannot change it.
2. THE LIFO STACKING RULE: Stacks are packed Last-In, First-Out. The panel with the LOWEST install_sequence in a stack must be the FIRST element in the panelIds array (it will be on top of the physical stack so the framer picks it up first).
3. THE LOAD CONSTRAINT: A single stack cannot exceed 500kg total weight UNLESS the Production Manager explicitly overrides this limit in their command.
4. THE LOCATION RULE: Try to group panels by zone so stacks can be dropped near where they'll be installed. But sequence takes priority over zone grouping.

CURRENT ACTIVE PANEL INVENTORY (active pending/stacked panels only, sorted by install_sequence):
${JSON.stringify(activePanels, null, 2)}

ALL PANELS STATE (including installed/damaged panels):
${JSON.stringify(currentPanels.map(p => ({ id: p.id, status: p.status, notes: p.notes })), null, 2)}

When generating a plan_update:
- Only include panels that are in the CURRENT ACTIVE PANEL INVENTORY (do not include installed or damaged panels).
- Assign stack IDs like STACK-01, STACK-02, etc.
- The target_zone should reflect the majority zone of the panels in the stack.
- You should assign all remaining active panels to appropriate delivery days and group them into stacks based on the constraints. Do not leave panels unassigned unless the PM's command explicitly requests to exclude them or to only plan a specific day. All planned panels should be output in the stacks.`;

    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: CommandResponseSchema,
      system: systemPrompt,
      prompt: command,
    });

    // Persist the generated stacks only if type is 'plan_update'
    if (result.object.type === 'plan_update' && result.object.stacks) {
      setStacks(result.object.stacks);
    }

    res.json({
      stacks: getStacks(),
      reasoning: result.object.reasoning,
    });
  } catch (error: any) {
    console.error('AI plan generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate response.',
      details: error.message,
    });
  }
});

// GET /api/deliveries?day={number} — Get delivery manifest
router.get('/', (req: Request, res: Response) => {
  const dayParam = req.query.day;

  if (dayParam) {
    const day = parseInt(dayParam as string, 10);
    if (isNaN(day)) {
      res.status(400).json({ error: 'Invalid day parameter.' });
      return;
    }
    const delivery = getDeliveryByDay(day);
    if (!delivery) {
      res.status(404).json({ error: `No delivery found for day ${day}.` });
      return;
    }
    res.json(delivery);
    return;
  }

  // No day param — return all deliveries
  res.json(getAllDeliveries());
});

export default router;
