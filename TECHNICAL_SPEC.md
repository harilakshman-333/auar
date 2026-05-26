# Technical Specification

## 1. Stack & Architecture
* **Frontend:** React + TypeScript.
* **Backend:** Node.js + Express + TypeScript.
* **AI Integration:** Vercel AI SDK (`npm install ai @ai-sdk/openai`).
* **Repository:** Single monorepo containing both client and server.
* **Database:** In-memory store or a local `data.json` file seeded with the provided AUAR dataset.

## 2. API Design

### `GET /api/panels`
* Returns all panels and their current assignment status.

### `POST /api/deliveries/ai-plan`
* **Payload:** `{ command: string, currentState: Panel[] }` (e.g., command: "Plan Day 1 deliveries assuming a 500kg limit")
* **Action:** Uses the Vercel AI SDK with a defined tool/function (e.g., `generateStacks`). The LLM calculates valid groupings enforcing the 500kg limit and LIFO sequencing, and returns structured JSON.
* **Returns:** An array of `Stack` objects.

### `GET /api/deliveries?day={number}`
* Returns the Delivery Manifest (Stacks and ordered Panels) for the Framer's daily view.

### `PATCH /api/panels/:id/status`
* **Payload:** `{ status: 'installed' | 'damaged' }`
* **Action:** Updates panel status.
* **Validation:** Backend MUST reject 'installed' if the panel is not the exact next sequential panel required globally. If 'damaged', this should ideally flag a warning on the PM's dashboard.