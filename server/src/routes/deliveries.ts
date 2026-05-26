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
  getPanelById,
  validateGlobalSequence,
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
// NOW: Returns proposed plan WITHOUT saving. PM must approve via /commit-plan.
router.post('/ai-plan', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      res.status(400).json({ error: 'A "command" string is required.' });
      return;
    }

    const currentPanels = getAllPanels();
    const activePanels = currentPanels.filter(
      (p) => p.status === 'pending' || p.status === 'stacked' || p.status === 'on_order'
    );
    const project = getProjectInfo();

    const systemPrompt = `You are the AUAR Delivery Assistant. You help a Production Manager (PM) manage modular timber-panel deliveries.

PROJECT: ${project.name} — ${project.site_address}

THE ROLE:
1. If the PM asks to plan or re-plan deliveries (e.g., "re-plan", "plan day 1", "limit weight", "truck broke down"), set type to "plan_update", generate the new stacks containing only the active panels, and provide the explanation in reasoning.
2. If the PM asks a question, requests information (e.g., "what panels are damaged?", "which panels are in stack 1?", "are there any damaged panels?"), or makes a comment, set type to "conversational", leave stacks empty/omitted, and write your direct answer to their question in reasoning.

STRICT RULES YOU MUST ALWAYS ENFORCE FOR PLAN UPDATES:
1. THE SEQUENCE RULE: Panels have an install_sequence number. Within each stack, panels MUST be ordered by install_sequence. This order is absolute and dictated by structural engineering — you cannot change it. Furthermore, delivery days must respect the sequence globally: if panel A has a lower install_sequence than panel B, then panel A's delivery_day must be less than or equal to panel B's delivery_day (i.e. A.delivery_day <= B.delivery_day). You cannot deliver a panel on an earlier day if its predecessor is only arriving on a later day.
2. THE LIFO STACKING RULE: Stacks are packed Last-In, First-Out. The panel with the LOWEST install_sequence in a stack must be the FIRST element in the panelIds array (it will be on top of the physical stack so the framer picks it up first).
3. THE LOAD CONSTRAINT: A single stack cannot exceed 500kg total weight UNLESS the Production Manager explicitly overrides this limit in their command.
4. THE LOCATION RULE: Try to group panels by zone so stacks can be dropped near where they'll be installed. But sequence takes priority over zone grouping.
5. REPLACEMENTS & BLOCKED SEQUENCES: 
   - When a panel is damaged, it is removed from the schedule. Its replacement panel (e.g., "EW-L1-S1-R1", status "on_order") inherits the original sequence number (e.g., Sequence #4).
   - Because Sequence #4 has not been delivered or installed yet, it BLOCKS all subsequent panels (Sequence #5, #6, etc.).
   - Therefore, you CANNOT schedule subsequent panels (like Sequence #5) on Day 1 unless the replacement panel (Sequence #4) is ALSO scheduled on Day 1 (or earlier).
   - If the replacement panel is not planned for Day 1, then all subsequent panels MUST be pushed to Day 2 or later (or left unscheduled).

CURRENT ACTIVE PANEL INVENTORY (active pending/stacked/on_order panels only, sorted by install_sequence):
${JSON.stringify(activePanels, null, 2)}

ALL PANELS STATE (including installed/damaged panels):
${JSON.stringify(currentPanels.map(p => ({ id: p.id, status: p.status, notes: p.notes, is_replacement: p.is_replacement, replaces_panel_id: p.replaces_panel_id })), null, 2)}

When generating a plan_update:
- Only include panels that are in the CURRENT ACTIVE PANEL INVENTORY (do not include installed or damaged panels).
- Panels with status "on_order" CAN be included in the plan (they are replacement panels being manufactured).
- Assign stack IDs like STACK-01, STACK-02, etc.
- The target_zone should reflect the majority zone of the panels in the stack.
- You should assign all remaining active panels to appropriate delivery days and group them into stacks based on the constraints. Do not leave panels unassigned unless the PM's command explicitly requests to exclude them or to only plan a specific day. All planned panels should be output in the stacks.`;

    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: CommandResponseSchema,
      system: systemPrompt,
      prompt: command,
    });

    // PLAN APPROVAL: Do NOT save plan_update stacks immediately.
    // Return them as pendingStacks for PM review.
    if (result.object.type === 'plan_update' && result.object.stacks) {
      const validateProposedStacks = (proposedStacks: any[]) => {
        const historicalPanelIds = new Set(
          getAllPanels().filter((p) => p.status === 'installed').map((p) => p.id)
        );
        const historicalStacks = getStacks().filter((stack) =>
          stack.panelIds.some((pid) => historicalPanelIds.has(pid))
        );
        
        // Auto-sort proposed stacks by sequence number ascending to ensure correct LIFO order
        for (const stack of proposedStacks) {
          stack.panelIds.sort((a, b) => {
            const pa = getPanelById(a);
            const pb = getPanelById(b);
            return (pa?.install_sequence ?? 0) - (pb?.install_sequence ?? 0);
          });
          stack.total_weight_kg = stack.panelIds.reduce((sum, pid) => {
            const p = getPanelById(pid);
            return sum + (p?.weight_kg ?? 0);
          }, 0);
        }

        validateGlobalSequence([...historicalStacks, ...proposedStacks]);
      };

      let finalStacks = result.object.stacks;
      let finalReasoning = result.object.reasoning;

      // Validate the AI proposed plan
      try {
        validateProposedStacks(finalStacks);
      } catch (err: any) {
        console.warn('AI proposed plan failed validation. Retrying with error feedback:', err.message);
        
        // Self-correction retry
        try {
          const retryPrompt = `Your previous plan failed validation with the following error:
"${err.message}"

Please correct the plan to resolve this error. Ensure that:
1. If a predecessor panel (lower sequence) is scheduled on a day, all subsequent panels (higher sequence) must be scheduled on the same day or a later day.
2. If a predecessor panel is NOT scheduled on Day 1 (e.g. because it is scheduled on Day 2 or is unscheduled), then NO subsequent panel can be scheduled on Day 1.
3. Every stack satisfies the LIFO sequence order.
4. Total stack weight stays under 500kg.`;

          const retryResult = await generateObject({
            model: openai('gpt-4o'),
            schema: CommandResponseSchema,
            system: systemPrompt,
            prompt: `${command}\n\n${retryPrompt}`,
          });

          if (retryResult.object.type === 'plan_update' && retryResult.object.stacks) {
            validateProposedStacks(retryResult.object.stacks);
            finalStacks = retryResult.object.stacks;
            finalReasoning = retryResult.object.reasoning;
            console.log('AI plan self-correction successful.');
          }
        } catch (retryErr: any) {
          res.status(400).json({ error: `AI plan generation failed validation: ${retryErr.message}` });
          return;
        }
      }

      res.json({
        type: 'plan_update',
        pendingStacks: finalStacks,
        currentStacks: getStacks(),
        reasoning: finalReasoning,
      });
    } else {
      res.json({
        type: 'conversational',
        stacks: getStacks(),
        reasoning: result.object.reasoning,
      });
    }
  } catch (error: any) {
    console.error('AI plan generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate response.',
      details: error.message,
    });
  }
});

// POST /api/deliveries/commit-plan — Approve and save a pending plan
router.post('/commit-plan', (req: Request, res: Response) => {
  try {
    const { stacks: newStacks } = req.body;

    if (!newStacks || !Array.isArray(newStacks)) {
      res.status(400).json({ error: 'A "stacks" array is required.' });
      return;
    }

    setStacks(newStacks);
    res.json({
      stacks: getStacks(),
      message: 'Plan approved and committed.',
    });
  } catch (error: any) {
    console.error('Plan commit failed:', error);
    const status = error.message.includes('Sequence violation') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

// PUT /api/deliveries/stacks — Save manually edited stacks with LIFO validation
router.put('/stacks', (req: Request, res: Response) => {
  try {
    const { stacks: editedStacks } = req.body;

    if (!editedStacks || !Array.isArray(editedStacks)) {
      res.status(400).json({ error: 'A "stacks" array is required.' });
      return;
    }

    // Auto-sort to be 100% robust against LIFO violations
    for (const stack of editedStacks) {
      stack.panelIds.sort((a, b) => {
        const pa = getPanelById(a);
        const pb = getPanelById(b);
        return (pa?.install_sequence ?? 0) - (pb?.install_sequence ?? 0);
      });
      
      stack.total_weight_kg = stack.panelIds.reduce((sum, pid) => {
        const p = getPanelById(pid);
        return sum + (p?.weight_kg ?? 0);
      }, 0);
    }

    // Server-side LIFO validation
    for (const stack of editedStacks) {
      let lastSeq = -1;
      for (const pid of stack.panelIds) {
        const panel = getPanelById(pid);
        if (!panel) {
          res.status(400).json({ error: `Panel "${pid}" not found in stack "${stack.id}".` });
          return;
        }
        // Skip already installed or damaged panels since they are not physically stacked anymore
        if (panel.status === 'installed' || panel.status === 'damaged') {
          continue;
        }
        if (panel.install_sequence < lastSeq) {
          res.status(400).json({
            error: `LIFO violation in stack "${stack.id}": Panel "${pid}" (seq #${panel.install_sequence}) comes after a panel with seq #${lastSeq}. Panels must be in ascending sequence order.`,
            stack: stack.id,
            violatingPanel: pid,
          });
          return;
        }
        lastSeq = panel.install_sequence;
      }

      // Weight validation (warning only, not blocking)
      if (stack.total_weight_kg > 500) {
        console.warn(`Stack "${stack.id}" exceeds 500kg limit: ${stack.total_weight_kg}kg`);
      }
    }

    setStacks(editedStacks, true);
    res.json({
      stacks: getStacks(),
      message: 'Stacks updated successfully.',
    });
  } catch (error: any) {
    console.error('Stack update failed:', error);
    const status = error.message.includes('Sequence violation') ? 400 : 500;
    res.status(status).json({ error: error.message });
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
