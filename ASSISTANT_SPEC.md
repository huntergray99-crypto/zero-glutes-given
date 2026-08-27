# In-app AI assistant — build spec

Status: **not started.** Written by the Firebase session for whichever session
picks this up. Additive feature — must not change existing behavior.

## Goal

A chat assistant ("Zoe") that rides along with the user the whole time:
answer celiac-safety questions, recommend spots, filter the map by natural
language, and hand off directions. It should feel like a concierge who already
knows the 29 restaurants in `src/data/restaurants.js`.

## Approach (today vs. later)

**Today — Puter.js.** One `<script>` tag, `puter.ai.chat()`, no API key, no
backend, "user-pays" billing. Fits the static GitHub Pages + Spark-plan setup.

**Later — swap the transport only.** All model calls go through
`src/lib/assistant.js` → `sendMessage()`. When Blaze is on, replace the Puter
call inside that one function with Firebase AI Logic (Vertex AI / Gemini). No
component changes. Leave a `// SWAP:` comment block there showing the Firebase
version.

> Do **not** put an API key anywhere in client code. Puter needs none; the
> Firebase AI Logic SDK keeps the key server-side. Those are the only two
> allowed options.

## Files to add

| File | Responsibility |
|---|---|
| `index.html` | add `<script src="https://js.puter.com/v2/"></script>` |
| `src/lib/assistant.js` | `sendMessage(history, ctx)`, the tool registry, tool dispatch, conversation persistence |
| `src/components/AssistantPanel.jsx` | chat UI (message list, input, "clear", disclaimer) |
| `src/components/AssistantFab.jsx` | floating button, bottom-right, sits above `.map-legend` |
| `src/App.jsx` | mount the FAB + panel; pass context + action callbacks |
| `src/App.css` | `.assistant-fab`, `.assistant-panel`, `.msg`, `.msg-user`, `.msg-bot`, `.msg-typing` — reuse `.detail` / `.detail-scrim` patterns |

## `assistant.js` shape

```js
// SWAP: this is the only function that talks to a model.
export async function sendMessage(history, ctx) {
  const messages = [{ role: 'system', content: systemPrompt(ctx) }, ...history];
  const res = await puter.ai.chat(messages, { model: 'gpt-4o-mini' }); // or 'claude-3-5-sonnet'
  return handleToolCalls(res, ctx); // parse tool intents, run them, loop once if needed
}
```

Puter's function-calling support is inconsistent across models. Safer: instruct
the model to emit a fenced ```json {"tool": "...", "args": {...}} block when it
wants data, parse that, run the tool, feed the result back for one more turn.
Keep it to a single tool round-trip per user message.

### Tools (all pure, operate on `restaurants.js` — no network)

- `findRestaurants({ cuisine?, safetyLevel?, neighborhood?, dedicatedFryer?, maxPrice?, near? })`
  → array of `{id, name, safetyLevel, neighborhood, cuisine, distanceMi?}`
- `getRestaurant({ id })` → full record incl. `whatToOrder`, `lastVerified`
- `getDirections({ id })` → `{ url: directionsUrl(r, ctx.userPosition), provider: directionsProvider() }`
- `recommend({ mood?, cuisine?, near? })` → 3 ranked picks with one-line why
- `applyFilter({ cuisine?, safetyLevel?, showHonorable? })` → calls back into App to set filters
- `openRestaurant({ id })` → calls back into App to open the detail panel

`applyFilter` / `openRestaurant` / `getDirections` need callbacks from App:
```jsx
<AssistantPanel
  ctx={{ userPosition: position, filters, selectedId: detailId,
         visitedIds: Object.keys(getProfile().checkIns) }}
  actions={{ applyFilter: setFilters, openRestaurant: selectRestaurant,
             openDirections: (url) => window.open(url, '_blank') }}
/>
```

## System prompt (essentials)

- You are Zoe, a celiac-safe dining concierge for Seattle. You only know the
  restaurants in the provided list — never invent a restaurant, an address, or a
  safety claim.
- Always state the spot's `safetyLevel` in plain words (Dedicated GF /
  Celiac-friendly / GF menu, shared kitchen / Honorable mention — not celiac-safe)
  and when its info was `lastVerified`.
- For anything safety-critical, end with: "confirm your needs with the restaurant
  — protocols change."
- Honorable-mention spots are NOT celiac-safe; only surface them if the user asks
  for cheap/healthy rather than safe.
- Be concise. Offer to pull up directions or filter the map.
- Inject each turn: user's current filters, the open restaurant (if any), whether
  location is on, list of spots they've checked into.

## Context handoff ("carry the customer")

Every `sendMessage` gets fresh `ctx`. The assistant can both *read* app state and
*drive* it (open a card, set a filter, open directions). If the user is standing
in a detail panel and asks "how do I get there", `getDirections` already knows
which restaurant. If they say "show me just the dedicated-GF pizza places", the
assistant calls `applyFilter` and the map updates behind the panel.

## State & privacy

- Conversation persists in `localStorage` key `zgg.assistant.v1`; "Clear chat"
  wipes it. Cap stored history at ~20 messages.
- Do NOT send precise coordinates to Puter unless the user asked for directions
  or "near me"; otherwise send only the neighborhood.
- Disclaimer line in the panel footer: "Chat runs through Puter's AI service.
  Don't share anything sensitive."
- No auth required to use the assistant (works signed-out).

## UI

- FAB: 52px circle, `var(--green)`, chat glyph, `position: fixed; right: 16px;
  bottom: 88px` (clear of the legend). Hidden when any `.detail` panel is open on
  mobile.
- Panel: desktop = right-side `.detail`-style column; mobile = bottom sheet ~70vh.
- Typing indicator while awaiting the model. Errors render as a bot message
  ("I'm having trouble reaching the assistant — try again").

## Done =

- `npm run lint` clean (oxlint), `npm run build` clean
- Assistant works signed-out and signed-in
- Existing map / list / detail / feed / profile behavior unchanged
- `sendMessage` is the single seam for the future Firebase AI Logic swap
