# Bigfoot Spectral Cell Sorter — Simulation Roadmap

POC purpose: validate the 3D + physics + telemetry stack as a foundation for AI-driven training
for students learning to operate a Thermo Fisher automated lab instrument.

Source of truth for instrument behavior: Bigfoot Spectral Cell Sorter High-Throughput Plate
Sorting White Paper (Thermo Fisher / Invitrogen, 2022–2024).

---

## What's Built (Phase 1 — Complete)

- Vite + React + TypeScript + React Three Fiber project
- CHO cell population simulation: FSC-A, FSC-H, SSC-A, UV-349 (Hoechst 33342)
  with realistic population mix (70% live singles, 20% debris, 10% doublets)
- Doublet discrimination via FSC-H/FSC-A ratio gating
- Straight-down and 4-way sort modes
- 96-well and 384-well plate support with accurate SBS geometry
- Sort state machine: IDLE → MOVING_TO_WELL → SORTING → WELL_DONE → PLATE_COMPLETE
- Stage kinematics calibrated to paper benchmarks:
  - 96-well straight-down: ~19.87s, 4-way: ~7.65s
  - 384-well straight-down: ~61.13s, 4-way: ~17.38s
- 3D scene: nozzle, droplet stream, laser beams, charge plates, stage assembly, well plate
- Live telemetry: FSC/SSC scatter plot, SVG plate map with fill animation, sort counters
- Controls: plate format, sort mode, events per well (1–4), simulation speed (1×–10×)
- Sort rate: 150 events/sec, drop spacing: 32 (matching paper defaults)

---

## Phase 2 — 1536-Well Plate + Advanced Sort Mode (Complete)

**Why:** The 1536-well plate and selective well targeting are two of the Bigfoot's biggest
product differentiators. The paper demonstrates full-plate sorting (~3:14/plate) and an
"Advanced Sort Mode" where only specific wells are targeted (e.g., a text pattern at ~43s).
This phase shows trainees the flexibility of the instrument.

**Physics / data model:**
- Add `'1536'` to `PlateType` in `types.ts`
  - Geometry: 32 rows × 48 cols, 2.25mm pitch, well radius ~0.55mm
  - Benchmark sort time: ~194s straight-down full plate
- Add `advancedWells: Set<number> | null` to `SorterConfig`
  - When `null`: sort all wells (current behavior)
  - When set: skip wells not in the set; stage jumps directly to next targeted well
- Advanced mode sort time scales with number of targeted wells, not plate total

**3D scene:**
- 1536-well plate uses `InstancedMesh` — 1536 wells at 2.25mm pitch is too dense for
  individual geometries; instances share one `CylinderGeometry`
- Scale the well plate label / plate map view accordingly

**Controls:**
- Add `1536-well` toggle to plate format selector
- Add "Advanced Mode" toggle that reveals a well-selection UI (draw/click wells to include)
- Show two estimated sort times: full plate vs. selected wells

**Telemetry:**
- Plate map canvas scales to fit 1536 wells (very small cells — tooltip on hover)
- Sort summary shows wells targeted vs. total available

---

## Phase 3 — InfiniSort + Post-Sort HRP/TMB Verification View

**Why:** The paper emphasizes InfiniSort (sequential plate reuse without realignment) as a
throughput feature. The HRP/TMB colorimetric assay is the real-world verification method —
visualizing it is the most educationally compelling thing the sim can add. Students can see
what a successful sort looks like and understand what "100% targeting accuracy" means.

**InfiniSort:**
- After `PLATE_COMPLETE`, show a "Swap Plate" prompt instead of immediately resetting
- User clicks confirm → plate resets with empty wells, same sort config, sort restarts
- Track cumulative plate count and total cells sorted across all plates in the run
- Mirrors the paper's replicated sorts (5× 96-well, 5× 384-well) with no realignment

**Post-sort HRP/TMB view:**
- New panel tab: "Verification View" (only active after `PLATE_COMPLETE`)
- Renders each well as a filled circle colored by deposited cell count:
  - 0 cells → clear (white/transparent)
  - 1 cell → pale blue
  - 2 cells → medium blue
  - 3 cells → dark blue
  - 4+ cells → vivid dark blue
- Gradient matches the TMB colorimetric reaction photos from the paper (Figures 5 and 6)
- Overlay shows well-level cell count on hover

**Sort summary screen:**
- Total plates completed, total cells sorted, overall sort efficiency (% events that passed gate)
- Elapsed time per plate with comparison to paper benchmarks
- Export-ready data table (future: CSV download)

---

## Phase 4 — Interactive Gating + Spectral Channels

**Why:** The instrument is called "Spectral" because it unmixes overlapping fluorescent
signals from many channels simultaneously. Currently only UV-349 (Hoechst viability) is
modeled. This phase teaches the core skill of gate optimization — the biggest variable a
trainee controls before committing to a long sort.

**Spectral channels:**
- Add 488nm-FSC (already present), 488nm-SSC (already present), plus:
  - `ch488_530`: FITC / GFP channel
  - `ch561_590`: PE channel
  - `ch638_660`: APC channel
- Simulate per-population distributions for each channel using Gaussian sampling
  (live singles bright in target channel, debris dim, doublets shifted)
- `CellEvent` gains these fields; gate UI gains axis dropdowns to switch displayed channels

**Interactive gating:**
- Make the sort gate polygon draggable on the scatter plot
  - Drag corner handles to resize the rectangle gate
  - Gate changes update `SorterConfig.gate` in the store
- Real-time feedback as gate moves:
  - Gate efficiency % (fraction of events passing gate) updates live
  - Estimated sort time updates (tighter gate = fewer targets = longer sort per well)
  - "Events/sec hitting gate" counter
- Teaches the tradeoff: purity (tight gate) vs. speed (loose gate)

**Doublet gate:**
- Second scatter plot panel: FSC-A vs. FSC-H (doublet discrimination plot)
- Interactive singlet ratio slider maps to `gate.singletRatio`
- Shows doublet cluster separating from singlet diagonal in real time

---

## Phase 5 — AI Tutor Overlay (Claude API)

**Why:** This is the original POC goal — a conversational training layer that watches what the
trainee is doing and guides them toward understanding, not just button-pushing.

**Architecture:**
- Floating chat panel (collapsible) powered by Claude API (`claude-sonnet-4-6`)
- System prompt includes: instrument facts from the white paper, current sim state snapshot
  (plate type, sort mode, gate settings, elapsed time, sort efficiency)
- State is injected as context on each message so Claude can respond to what the student
  is actually doing

**Tutor behaviors:**
- Socratic questioning when student changes settings:
  - Switches to 4-way: "What advantage does 4-way sorting give you over straight-down?"
  - Tightens gate: "Your gate efficiency just dropped to 12%. What does that mean for
    how long your sort will take?"
  - Selects 1536-well: "Why might a researcher choose a 1536-well plate over 96-well?"
- Proactive observations at milestones:
  - Sort complete: "Your sort took 22s — the paper benchmark is 19.87s. What might
    account for the difference?"
  - InfiniSort plate 3: "You're now on plate 3 with no realignment. Why does the Bigfoot
    not need recalibration between plates?"
- Reference to paper figures when relevant (e.g., explain the TMB verification method when
  the post-sort view is opened)

**Failure scenario mode (stretch):**
- Introduce simulated instrument faults for diagnosis practice:
  - Drop spacing too low → high abort rate, slow sort
  - Gate misconfigured → 0% sort efficiency (no cells deposited)
  - Stage misalignment → random wells skipped
- Student uses telemetry to identify and correct the fault
- Tutor guides without giving the answer directly
