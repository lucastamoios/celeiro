# Design Principles

> The philosophy behind Celeiro's visual language

## Core Identity: Confident Stewardship

Celeiro is not just another budgeting app. It embodies a philosophy:

> **"A wise steward knows what they have, where it goes, and what it's for."**

### The Celeiro User

Our user is:
- A **provider** - responsible for family/household finances
- **Intentional** - wants control, not just tracking
- **Forward-thinking** - saves for known AND unknown future needs
- **Grounded** - values sustainability over accumulation

### The Emotional Journey

| Stage | User Feeling | UI Response |
|-------|--------------|-------------|
| Opening app | "Let me check on things" | Calm, organized first impression |
| Viewing dashboard | "How am I doing?" | Clear, confident answer in 2 seconds |
| Reviewing budget | "Am I on track?" | Honest but encouraging feedback |
| Categorizing | "This is manageable" | Quick, frictionless workflow |
| Seeing savings | "We're building something" | Progress that feels meaningful |

---

## The Five Principles

### 1. Clarity Over Decoration

**Before:** Colors used decoratively (each category a different rainbow color)
**After:** Colors used meaningfully (status, actions, warnings only)

```
BAD:  🔴 Food  🟡 Transport  🟢 Health  🔵 Education  🟣 Entertainment
GOOD: All categories use warm neutral, color only for BUDGET STATUS
```

**Application:**
- Reduce category color palette to 6-8 muted tones
- Reserve bright colors for status indicators only
- Use typography and spacing for hierarchy, not color

### 2. Hierarchy Through Restraint

Not everything can be important. The UI must guide attention.

**Visual Hierarchy Stack:**

```
Layer 1: THE ANSWER (largest, most prominent)
         "You're R$ 234 under budget this month" ✓

Layer 2: THE CONTEXT (medium, supportive)
         Category breakdown, trends, charts

Layer 3: THE DETAILS (smallest, on-demand)
         Individual transactions, settings
```

**Application:**
- Dashboard shows one clear status message first
- Secondary info requires scrolling or expanding
- Details live in modals or drill-down views

### 3. Warmth Without Whimsy

Finance is serious, but shouldn't feel clinical. Celeiro should feel like:
- A well-organized pantry (warm, wooden, abundant)
- NOT a hospital (sterile, cold, anxious)
- NOT a playground (chaotic, unserious)

**Visual Cues:**
- Warm neutral backgrounds (cream, wheat, stone)
- Rounded corners (but not bubbly)
- Subtle shadows (grounded, not floating)
- Natural accent colors (amber, forest, rust)

**Application:**
- Base background: warm off-white (`#FAFAF8`)
- Card backgrounds: clean white with warm shadow
- Accent colors: harvest palette (wheat, sage, terracotta)

### 4. Progressive Disclosure

Show summary first, details on demand.

**Pattern:**

```
COLLAPSED STATE:
┌─────────────────────────────────┐
│ 🍽️ Alimentação    R$ 1.200 / R$ 1.500   [▓▓▓▓▓▓░░░░] 80%
└─────────────────────────────────┘

EXPANDED STATE (on click):
┌─────────────────────────────────┐
│ 🍽️ Alimentação    R$ 1.200 / R$ 1.500   [▓▓▓▓▓▓░░░░] 80%
├─────────────────────────────────┤
│  Recent:                        │
│  • Supermercado XYZ  -R$ 234    │
│  • Restaurante ABC   -R$ 89     │
│  • Padaria           -R$ 12     │
│                    [Ver todas →]│
└─────────────────────────────────┘
```

**Application:**
- Budget cards collapse to single status line
- Categories show summary, expand for transactions
- Goals show progress, expand for contribution history

### 5. Honest Encouragement

The app should tell the truth but frame it constructively.

**Status Messages:**

| Status | Tone | Example |
|--------|------|---------|
| On track | Confident | "Você está no caminho certo" |
| Slightly over | Helpful | "R$ 50 acima - ajuste pequeno resolve" |
| Significantly over | Honest | "Atenção: R$ 500 acima do planejado" |
| Way under | Celebratory | "Ótimo! R$ 200 sobrando este mês" |

**Color Coding:**

```
✓ On track:     Calm green  (not bright, not alarming)
⚠ Watch out:    Warm amber  (attention, not panic)
✗ Over budget:  Muted red   (serious, not screaming)
```

---

## Design Decisions Framework

When making UI decisions, ask:

### 1. Does this create calm or anxiety?
- Calm: White space, clear hierarchy, muted colors
- Anxiety: Dense data, competing colors, everything bold

### 2. Can the user answer their question in 2 seconds?
- Good: "Am I on budget?" → Green checkmark visible immediately
- Bad: User must scan multiple cards to calculate status

### 3. Does this feel like Celeiro (granary/storehouse)?
- Yes: Warm, organized, abundant but not excessive
- No: Cold, chaotic, or frivolously playful

### 4. Is color being used meaningfully?
- Meaningful: Status indicator, actionable element
- Decorative: "This category is purple because variety"

### 5. What's the information hierarchy?
- Ask: What's the ONE thing user needs from this view?
- That thing should be most visually prominent

---

## Anti-Patterns to Avoid

### 1. Rainbow Dashboard
Every widget a different color = visual chaos

### 2. Dense Data Tables
Walls of numbers without visual breaks = cognitive overload

### 3. Competing CTAs
Multiple bright buttons fighting for attention = decision paralysis

### 4. Notification Overload
Red badges everywhere = anxiety, learned to ignore

### 5. Over-Gamification
Too many badges/streaks/celebrations = feels unserious for finance

---

## Inspiration Board

### Apps to Learn From

**YNAB** - Philosophy
- "Give every dollar a job" mindset
- Budget categories as first-class citizens
- Clear overspent/available indicators

**Linear** - Visual Calm
- Masterful use of white space
- Muted color palette
- Information density that doesn't overwhelm

**Notion** - Warmth
- Warm neutral tones
- Approachable without being childish
- Good balance of personality and professionalism

**Apple Health/Fitness** - Progress
- Ring visualizations for goals
- Celebration of milestones
- Confidence through simplicity

### Visual References

**Granary/Harvest Imagery:**
- Wheat fields at golden hour
- Organized wooden shelves
- Terracotta and earthenware
- Handwoven baskets

These natural elements inform our color choices and the feeling of "organized abundance."

---

## Summary

Celeiro's redesign follows these principles:

1. **Clarity Over Decoration** - Color means something
2. **Hierarchy Through Restraint** - Not everything is important
3. **Warmth Without Whimsy** - Serious but not cold
4. **Progressive Disclosure** - Summary first, details on demand
5. **Honest Encouragement** - Truth framed constructively

Every design decision should pass the test:

> **"Does this help the user feel confident about their family's financial future?"**
