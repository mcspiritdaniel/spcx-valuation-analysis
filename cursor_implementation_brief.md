# SPCX Valuation App — Cursor Implementation Brief

## What you're building
A React app that lets a user drag sliders for ~68 SpaceX valuation inputs and see the
resulting per-share value ($85.00 at current/default settings) update live, alongside
segment-level detail (Space, Connectivity, AI, Expansion) and supporting bridge tables.

This is the third of three source artifacts, in this order of authority:
1. `spcx_control_schema.json` — every input's value, range, unit, segment, tier, and
   card placement. This is the single source of truth for what each slider is and does.
2. `operating_engine.mjs` — the calculation engine. Pure functions, validated
   bit-for-bit against the audited Excel model across all six calculation tabs
   (Operating, Investment, Adjustments, WACC, EV, Valuation). Entry point:
   `runFullEngine(schema)` → returns the full result tree, ending in
   `result.valuation.perShareRounded`.
3. The Claude Design mock (link/export provided separately) — visual and interaction
   reference only. If the mock's layout and this brief conflict, this brief wins on
   anything data/calculation-related; the mock wins on pure visual styling.

## Core wiring task
Currently the engine reads `spcx_control_schema.json` from disk via `fs.readFileSync`
(Node-only). For a browser app:
- Import the schema as a JS/JSON module (bundler-friendly) instead of reading it from
  disk, OR fetch it at load time and pass the parsed object into `buildEngineInputs()`.
- Keep slider state (68 values) in React state, keyed by `Control!C<row>` id (matches
  each entry's `id` field in the schema).
- On any slider change: clone the schema's `controls` array, patch the changed
  entry's `value`, call `runFullEngine(patchedSchema)`, re-render from the result.
- This is a pure recalculation on every change — no debouncing needed unless
  performance testing says otherwise (the model is not large; recompute cost should
  be sub-millisecond).

## Known non-obvious behaviors (do not "fix" these — they are correct)
- **WACC uses a static, non-circular capital structure weight**
  (`WC.staticEquityValue = 877186`, `WC.totalDebt = 29111`, both hardcoded constants,
  not schema-driven). This is intentional — see the engine's WACC section comments.
  Do not wire this to live equity value; it would introduce a real circular
  dependency the model was deliberately designed to avoid.
- **Expansion's terminal value is NOT a simple Gordon-growth calc.** It's a
  probability-weighted (Bear/Base/Bull) H-model. Expansion's RR_ss and the Bear/Base/Bull
  scenario multipliers/probabilities are all *derived*, not schema sliders themselves
  (see `buildEngineInputs()` — spread/odds sliders feed the derivation).
- **AI segment Enterprise Value can be legitimately negative** at extreme slider
  settings. Do not floor at zero. Show the actual negative number, plus the
  conditional note already specified to Design: *"At these settings, AI's expected
  returns don't cover its cost of capital — this segment is a net drag on equity
  value."*
- **Expansion's ROIC vs. WACC spread is always exactly zero** — a structural
  identity (RR_ss is defined as g/WACC), not a forecast. Show the explanatory note
  already specified to Design in place of a numeric spread for this one row.
- **21 "Valuation & Market Inputs" sliders have no app_tier/card_tier** — this is
  intentional (see each entry's `home_card: "valuation_market_inputs"`), not missing
  data. They belong on one dedicated card, in schema order.
- **The shared NWC control** (`Change in NWC (Space, AI, Expansion)`, row 42) has
  `shared_with_segments: ["AI", "Expansion"]` — one slider, rendered/bound identically
  on all three cards. Don't create three independent state entries for it.

## Time-series data (for charts, if/when built)
Every segment's full year-by-year path is already computed internally, even though
only terminal/aggregate values are in the current UI:
`result.operating.space.revenue` / `.margin` / `.ebit` (and same for `.connectivity`,
`.ai`, `.expansion`) are 11-element arrays, index 0 = 2025 through index 10 = 2035.
No engine changes needed to expose these — just surface them in whatever chart
component gets built.

## Static reference data (not schema/engine-driven)
Share Count Bridge, Net Cash Bridge, and the Unlock Schedule are 424B4-sourced
constants, not calculated — they live in `runValuation()`'s `VC` object and don't
change with sliders except the four Enterprise Value lines flowing into Equity Value.
The Unlock Schedule table (18 events + 2 footnotes) was handed to Design as static
copy; pull it from that spec rather than re-deriving from the workbook.

## Validation before calling this done
Re-run the same golden-case check used to validate the engine itself: at default
schema values, `result.valuation.perShareRounded` must equal 85. If it doesn't, the
wiring — not the engine — is the first place to look, since the engine has already
been separately proven correct against the audited model.
