# Aggroso Color Palette

> **Source:** Aggroso official website (`aggroso.com`) and the provided Aggroso screenshots.
>
> **Purpose:** Use this palette for the Field Service Dispatch & Replanning Agent so the challenge project visually belongs to the Aggroso design system.

The current Aggroso site uses a dark, technical visual language with warm off-white surfaces, mint/green highlights, coral accents, and subtle blue atmospheric gradients. The palette below is reconstructed from the visible website/screenshot colors; it should be treated as a **design-matching palette**, not as an official published CSS token list.

## 1. Core Palette

| Token | HEX | RGB | Role |
|---|---|---|---|
| `--aggroso-bg` | `#07171D` | `7, 23, 29` | Main dark page background |
| `--aggroso-bg-soft` | `#101F25` | `16, 31, 37` | Header, dark cards, panels |
| `--aggroso-bg-teal` | `#0D2630` | `13, 38, 48` | Elevated dark/teal surfaces |
| `--aggroso-cream` | `#FBF8F1` | `251, 248, 241` | Primary light surface |
| `--aggroso-cream-soft` | `#F2EDE3` | `242, 237, 227` | Secondary surface / cards |
| `--aggroso-mint` | `#A9DFCB` | `169, 223, 203` | Primary accent / positive states |
| `--aggroso-coral` | `#F4A78E` | `244, 167, 142` | Secondary accent / attention |
| `--aggroso-text` | `#FFFDF8` | `255, 253, 248` | Primary text on dark backgrounds |
| `--aggroso-text-dark` | `#102025` | `16, 32, 37` | Primary text on light backgrounds |
| `--aggroso-muted` | `#89857C` | `137, 133, 124` | Secondary/muted text |
| `--aggroso-border` | `#DAD3C9` | `218, 211, 201` | Light borders/dividers |
| `--aggroso-border-dark` | `#294047` | `41, 64, 71` | Dark borders/dividers |

## 2. Recommended Application

### Dark surfaces

Use these for the primary application shell:

```css
--background: #07171D;
--surface-dark: #101F25;
--surface-dark-elevated: #0D2630;
```

Recommended usage:

- Application sidebar
- Top navigation
- Main dashboard background
- Timeline background
- AI assistant panel
- Technician cards
- Dark modal/dialog sections

### Light surfaces

```css
--surface: #FBF8F1;
--surface-soft: #F2EDE3;
```

Recommended usage:

- Schedule cards
- Request details
- Forms
- Approval dialogs
- Data tables
- Assignment detail panels

### Mint accent

```css
--accent: #A9DFCB;
```

Use mint for:

- Primary positive states
- Valid assignments
- Available technicians
- Completed work
- AI confidence/assist indicators
- Active navigation indicators
- Success messages
- Important but non-destructive actions

Do **not** use mint for every button. It should remain an accent.

### Coral accent

```css
--accent-attention: #F4A78E;
```

Use coral for:

- Warnings
- Schedule conflicts
- At-risk requests
- Emergency/cancellation indicators
- Important attention states
- Secondary visual emphasis

Avoid using coral for destructive actions unless the design context clearly requires it.

## 3. Typography Colors

### On dark backgrounds

```css
--text-primary: #FFFDF8;
--text-secondary: #B8C0C1;
--text-muted: #89969A;
```

### On light backgrounds

```css
--text-primary-dark: #102025;
--text-secondary-dark: #4B5659;
--text-muted-dark: #89857C;
```

The visual hierarchy should remain strong:

1. Cream/off-white — headings and important information
2. Muted gray — supporting information
3. Mint — meaningful positive/active information
4. Coral — attention/warning information

## 4. Status Colors for the Dispatch App

Keep status colors compatible with the Aggroso palette instead of introducing a large unrelated color system.

| Status | Suggested color | HEX |
|---|---|---|
| Available | Mint | `#A9DFCB` |
| Assigned | Teal | `#0D2630` |
| In Progress | Mint | `#A9DFCB` |
| Completed | Soft mint | `#8FCDB8` |
| Pending Approval | Cream | `#F2EDE3` |
| At Risk | Coral | `#F4A78E` |
| Conflict | Coral | `#F4A78E` |
| Unassigned | Muted gray | `#89857C` |
| Cancelled | Muted gray | `#89857C` |
| Emergency | Coral | `#F4A78E` |

For status chips, pair the color with an icon or text label. Do not rely on color alone.

## 5. Dispatch Timeline

The timeline should be predominantly dark, matching Aggroso's visual identity.

```text
Page
└── #07171D

    Timeline
    ├── Header       #101F25
    ├── Grid         #294047
    ├── Empty slot   #0D2630
    ├── Assigned     #A9DFCB
    ├── At risk      #F4A78E
    └── Completed    #8FCDB8
```

Example:

```css
.timeline {
  background: #07171D;
  border: 1px solid #294047;
}

.timeline-slot {
  background: #0D2630;
  border-color: #294047;
}

.assignment-valid {
  background: #A9DFCB;
  color: #102025;
}

.assignment-risk {
  background: #F4A78E;
  color: #102025;
}
```

## 6. AI Copilot

The AI assistant should feel integrated into Aggroso rather than looking like a generic chatbot.

Recommended:

- Dark panel: `#101F25`
- Main text: `#FFFDF8`
- AI accent: `#A9DFCB`
- Borders: `#294047`
- Recommendation cards: `#0D2630`
- Warning/risk: `#F4A78E`

Example visual hierarchy:

```text
┌─────────────────────────────────────────┐
│ AI DISPATCH ASSIST                      │
│                                         │
│ ● Suggested schedule                    │
│                                         │
│ 18 requests assigned                    │
│ 2 requests require review               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Why this plan?                      │ │
│ │                                     │ │
│ │ Keeps all priority requests inside  │ │
│ │ their preferred windows while...    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [ Review changes ]   [ Ask AI ]         │
└─────────────────────────────────────────┘
```

The AI should **not** visually appear to have authority over the schedule. The UI should clearly communicate:

> AI proposes → Rules validate → Dispatcher approves.

## 7. Buttons

### Primary

Use the warm cream surface for important actions on dark backgrounds:

```css
background: #FBF8F1;
color: #102025;
```

Example:

```text
[ Approve Schedule ↗ ]
```

### Secondary

Use dark/teal surfaces with light borders:

```css
background: #0D2630;
color: #FFFDF8;
border: 1px solid #294047;
```

### Accent

Use mint for positive workflow actions:

```css
background: #A9DFCB;
color: #102025;
```

Good examples:

- Confirm assignment
- Mark available
- Resolve risk

## 8. Cards

### Dark card

```css
background: #101F25;
border: 1px solid #294047;
color: #FFFDF8;
```

### Light card

```css
background: #F2EDE3;
border: 1px solid #DAD3C9;
color: #102025;
```

Use rounded corners, but avoid excessive "SaaS dashboard" styling. Aggroso's visual language is more editorial, structured, and operational.

## 9. Background Gradient / Glow

The screenshots contain a subtle blue atmospheric glow rather than a flat dark background.

A restrained approximation:

```css
background:
  radial-gradient(
    circle at 70% 20%,
    rgba(20, 54, 100, 0.35),
    transparent 35%
  ),
  #07171D;
```

Keep this subtle. It should support the interface rather than become the primary visual element.

## 10. Grid / Technical Texture

Aggroso uses subtle grid lines in dark sections.

Recommended:

```css
background-image:
  linear-gradient(
    rgba(169, 223, 203, 0.035) 1px,
    transparent 1px
  ),
  linear-gradient(
    90deg,
    rgba(169, 223, 203, 0.035) 1px,
    transparent 1px
  );

background-size: 76px 76px;
```

Use this mainly for:

- Dashboard backgrounds
- Timeline areas
- Hero/overview sections

Avoid using it behind dense tables because it can reduce readability.

## 11. Tailwind-Friendly Tokens

If using Tailwind, define semantic tokens rather than repeatedly using raw HEX values.

Suggested naming:

```js
colors: {
  aggroso: {
    bg: "#07171D",
    "bg-soft": "#101F25",
    "bg-teal": "#0D2630",

    cream: "#FBF8F1",
    "cream-soft": "#F2EDE3",

    mint: "#A9DFCB",
    coral: "#F4A78E",

    text: "#FFFDF8",
    "text-dark": "#102025",

    muted: "#89857C",

    border: "#DAD3C9",
    "border-dark": "#294047"
  }
}
```

Example classes:

```html
<div class="bg-aggroso-bg text-aggroso-text">
```

```html
<div class="bg-aggroso-bg-soft border border-aggroso-border-dark">
```

```html
<button class="bg-aggroso-mint text-aggroso-text-dark">
```

## 12. CSS Variables

Recommended global variables:

```css
:root {
  --aggroso-bg: #07171D;
  --aggroso-bg-soft: #101F25;
  --aggroso-bg-teal: #0D2630;

  --aggroso-cream: #FBF8F1;
  --aggroso-cream-soft: #F2EDE3;

  --aggroso-mint: #A9DFCB;
  --aggroso-coral: #F4A78E;

  --aggroso-text: #FFFDF8;
  --aggroso-text-dark: #102025;

  --aggroso-muted: #89857C;

  --aggroso-border: #DAD3C9;
  --aggroso-border-dark: #294047;
}
```

## 13. Design Rules

### Do

- Use dark navy/blue-black as the main application environment.
- Use warm cream for important light surfaces.
- Use mint as the primary brand accent.
- Use coral sparingly for attention and risk.
- Keep borders subtle.
- Use generous spacing.
- Use strong typography hierarchy.
- Use thin technical grid lines where appropriate.
- Keep AI recommendations visually distinct but integrated.
- Make dispatcher actions visually obvious.
- Preserve a human-controlled operational feel.

### Don't

- Use bright purple/pink AI gradients.
- Use generic blue SaaS dashboards.
- Use excessive glassmorphism.
- Use neon green.
- Use many competing status colors.
- Turn every card into a rounded floating container.
- Make the AI look like the final authority.
- Use saturated colors for large background areas.

## 14. Suggested Semantic Design System

For the Field Service Dispatch application:

```text
AGGROSO DISPATCH UI
│
├── Foundation
│   ├── Background       #07171D
│   ├── Surface          #101F25
│   ├── Surface Elevated #0D2630
│   ├── Light Surface    #FBF8F1
│   └── Light Surface 2  #F2EDE3
│
├── Brand
│   ├── Mint             #A9DFCB
│   └── Coral            #F4A78E
│
├── Typography
│   ├── Light Primary    #FFFDF8
│   ├── Dark Primary     #102025
│   └── Muted            #89857C
│
└── Borders
    ├── Light            #DAD3C9
    └── Dark             #294047
```

## 15. Design Principle

The visual system should communicate:

**Clear systems. Accountable handoffs. Human control.**

That fits the current Aggroso positioning around custom software, AI-assisted workflows, review, permissions, and traceability. citeturn0search0turn0search2

The palette is intentionally restrained so the scheduling information remains the visual priority.

---

### Source Note

The palette was reconstructed from the visible Aggroso website and the provided screenshots. The official site currently presents a dark operational interface with warm light surfaces and mint/coral visual accents. citeturn0search0

**Do not describe these HEX values as official Aggroso design tokens unless the site's source CSS is inspected and confirms them.**
