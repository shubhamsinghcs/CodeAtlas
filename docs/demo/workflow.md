# CodeAtlas 45-Second Demo Workflow

This script is designed for recording a 45-second high-impact demonstration of CodeAtlas for the README or social media.

## Prerequisites
- A complex target repository (e.g., `express`, `react`, or CodeAtlas itself).
- Ensure `AI_PROVIDER` and `AI_API_KEY` are exported.
- Have a screen recording tool ready (e.g., ScreenFlow, OBS).

## Script

**0:00 - 0:05 | Analyze**
- Open a terminal in the target repository.
- Type: `codeatlas analyze .`
- Hit Enter. The terminal logs rapid AST extraction and dependency mapping.
- Type: `codeatlas serve`
- Hit Enter. The server starts.

**0:05 - 0:15 | Open Dashboard**
- Open `http://localhost:3000` in the browser.
- Briefly show the **Overview** page statistics.
- Click **"Explore Architecture"**.

**0:15 - 0:25 | Architecture & Graph**
- On the Graph view, zoom out to show the density of the dependency tree.
- Pan across the nodes.
- Filter for a known complex file using the search bar (e.g., `index.ts` or `router.ts`).

**0:25 - 0:35 | Risk & Impact**
- Click on the node in the graph. The side panel slides in.
- Click **"Analyze Impact"**.
- The Impact Panel loads, highlighting the direct and transitive blast radius in the graph.
- Scroll down to read the **AI-generated "What changes if I edit this file?"** explanation.

**0:35 - 0:45 | The Agent Handoff (MCP)**
- Switch to Claude Desktop (or Cursor).
- Type a prompt: *"I want to refactor the routing logic. Use the codeatlas tools to analyze `router.ts` and give me an implementation plan that avoids breaking the transitive dependencies."*
- Watch the agent seamlessly invoke `codeatlas_get_impact` and `codeatlas_plan_change` and formulate a perfectly mapped architectural plan.
