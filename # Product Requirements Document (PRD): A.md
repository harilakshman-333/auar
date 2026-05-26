# Product Requirements Document (PRD): AUAR Panel Delivery System

## 1. Overview
We are building an end-to-end MVP to manage timber-panel deliveries for AUAR micro-factories. The system bridges the gap between the Production Manager planning deliveries in the office and the Framer receiving/installing them on the construction site. 

Crucially, this system acts as a constraint-solving engine. Construction plans change constantly (trucks break down, panels get damaged). The core value of this MVP is using AI to help the Production Manager recalculate complex delivery constraints instantly.

## 2. Target Users & Environment
* **Production Manager:** Works on a desktop or tablet in an office. They group panels into Stacks, assign Stacks to Delivery Days, and handle logistical exceptions.
* **Framer:** Works outdoors on the construction site. They rely entirely on a mobile phone, wear heavy work gloves, and face varying weather conditions. 

## 3. Core Business Rules (Strict Constraints)
* **The Sequence Rule:** Panels must be installed in an exact, unchangeable sequence dictated by structural engineering.
* **The LIFO Stacking Rule:** To satisfy the sequence rule, stacks must be packed Last-In, First-Out (LIFO). The first panel the framer needs must be on top of the stack.
* **The Load Constraint:** A single delivery stack cannot exceed 500kg.
* **The Location Rule:** Stacks should be dropped near the zone where the panels will be installed to minimize site movement.

## 4. Feature Requirements

### Production Manager View (Desktop)
* **The Command Bar (Core AI Feature):** A natural language input where the PM can type constraints or exceptions (e.g., "The truck broke down, limit Day 1 to 200kg total" or "EW-L1-N1 is damaged, re-plan the remaining sequence").
* **AI Exception Solver:** Uses an LLM with Structured Outputs (Function Calling) to read the command, recalculate the valid Stacks based on the strict Business Rules, and return a newly structured delivery plan.
* **Delivery Manifest View:** A visual summary of planned stacks, showing the total weight and strictly ordered panels inside each stack.

### Framer View (Mobile)
* **Mobile-First UX:** Ultra-high contrast, massive tap targets. **Strictly NO AI or chatbots on this view.** The focus is pure ergonomics and cognitive ease.
* **Stage 1: Receiving:** A view showing incoming stacks for the day and the recommended site drop-zone.
* **Stage 2: Assembly (Focus Mode):** A single-panel view showing only the currently required panel. Features a giant "Mark Installed" button, and a red "Report Damaged" button. The user cannot view or skip to the next panel until the current one is installed. 

## 5. Out of Scope for MVP
* User authentication (use a simple UI toggle to switch between PM and Framer views).
* Real-time WebSockets.
* Complex vehicle routing physics.