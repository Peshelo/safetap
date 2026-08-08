# styles.md

> **Purpose**
>
> This document defines the **visual design system** for the Government Mobile Application.
>
> It is written for an AI coding agent and must be followed exactly.
>
> **Priority**
>
> Functional correctness > Accessibility > Consistency > Visual aesthetics.
>
> Never invent new colors, spacing, typography or component styles unless they are added here.

---

# Design Philosophy

The application should feel like a modern consumer application rather than a traditional government system.

Design inspiration:

- Citizen
- Uber
- inDrive
- Apple Wallet
- Google Wallet
- Revolut
- Notion (minimalism)
- Stripe Dashboard

Characteristics:

- Premium
- Calm
- Highly readable
- Extremely fast
- Dense but not cluttered
- Professional
- Trustworthy
- Modern

Avoid making it look like:

- Bootstrap
- Material 2
- Government websites
- Enterprise dashboards
- Generic admin templates

---

# Visual Personality

The interface should communicate:

- Safety
- Trust
- Authority
- Simplicity

without feeling bureaucratic.

Everything should feel intentional.

---

# General Rules

## Never

❌ Thick borders

❌ Heavy shadows

❌ Bright gradients

❌ Random colors

❌ Glassmorphism

❌ Neumorphism

❌ Rounded pills everywhere

❌ Excessive animations

❌ Large floating buttons

❌ Overly colorful UI

---

## Always

✓ Plenty of whitespace

✓ Clear hierarchy

✓ Large touch targets

✓ Consistent spacing

✓ Clean typography

✓ Flat surfaces

✓ Subtle elevation

✓ High contrast

---

# Elevation

Default elevation is **0**.

Use shadows very sparingly.

## Allowed elevations

### Level 0

Most surfaces.

Examples

- pages
- cards
- lists
- forms

No shadow.

---

### Level 1

Only when floating over content.

Examples

- Bottom sheet
- Modal
- Floating Search

Shadow

```
Opacity: 0.08

Blur: 20

Y: 8
```

---

### Level 2

Only:

- dialogs
- action menus

Shadow

```
Opacity: 0.12

Blur: 28

Y: 12
```

Nothing higher.

---

# Border Radius

Large radius is avoided.

| Component | Radius |
|-----------|--------|
| Button | 12 |
| Card | 16 |
| Sheet | 24 |
| Modal | 20 |
| Input | 12 |
| Chip | 999 |
| Image | 16 |

---

# Borders

Prefer borders instead of shadows.

Border:

```
1px
```

Color

```
Neutral 200
```

Cards may use

```
Neutral 100
```

---

# Color System

## Primary

```
#0F4C81
```

Government blue.

---

## Primary Hover

```
#0C416E
```

---

## Primary Pressed

```
#09365B
```

---

## Success

```
#0E9F6E
```

---

## Warning

```
#F59E0B
```

---

## Danger

```
#DC2626
```

---

## Information

```
#2563EB
```

---

# Neutral Palette

```
950  #0B1220

900  #111827

800  #1F2937

700  #374151

600  #4B5563

500  #6B7280

400  #9CA3AF

300  #D1D5DB

200  #E5E7EB

100  #F3F4F6

50   #F9FAFB
```

---

# Backgrounds

Primary page

```
Neutral 50
```

Cards

```
White
```

Section

```
Neutral 100
```

Dark mode

```
#0B1220
```

---

# Text

Primary

```
Neutral 950
```

Secondary

```
Neutral 600
```

Muted

```
Neutral 500
```

Disabled

```
Neutral 400
```

Inverse

```
White
```

---

# Typography

Font Family

```
Inter
```

Fallback

```
SF Pro
Roboto
System
```

Never use more than one font.

---

# Font Sizes

Display

40

---

Heading 1

32

Weight

700

---

Heading 2

28

Weight

700

---

Heading 3

24

Weight

600

---

Title

20

Weight

600

---

Subtitle

18

Weight

600

---

Body

16

Weight

400

---

Body Small

14

Weight

400

---

Caption

12

Weight

500

---

Button

16

Weight

600

---

# Line Heights

Display

48

Heading

40

Body

24

Caption

18

---

# Layout Grid

Screen padding

```
20
```

Card spacing

```
16
```

Section spacing

```
32
```

Component spacing

```
12
```

Micro spacing

```
8
```

Tiny spacing

```
4
```

Never use arbitrary spacing.

---

# Component Heights

Small Button

40

Default Button

48

Large Button

56

Input

56

Search

56

Bottom Navigation

72

App Bar

64

List Tile

72

---

# Buttons

Primary

Filled.

No shadow.

Background

Primary

Text

White

Radius

12

---

Secondary

Border only.

Background

Transparent.

---

Tertiary

Text only.

---

Danger

Red background.

---

Loading

Spinner only.

Do not resize.

---

Disabled

Background

Neutral 200

Text

Neutral 500

---

# Cards

Cards should feel flat.

Padding

20

Radius

16

Border

1px

No shadow.

Never use gradients.

---

# Inputs

Height

56

Radius

12

Border

1px

Focused

Primary border

2px

No shadow.

---

# Search

Rounded rectangle.

Not pill.

Height

56

Leading search icon.

Trailing filter icon optional.

---

# Lists

Each row

72 height

Avatar optional

Chevron optional

Divider

Neutral 100

---

# Icons

Use

Material Symbols Rounded

or

Lucide

Never mix icon packs.

Icon size

24

Small

20

Large

32

---

# Navigation

Bottom navigation.

Maximum

5 items.

Labels always visible.

Selected item

Primary color.

Unselected

Neutral 500.

---

# Top App Bar

Height

64

Large title.

Optional subtitle.

Back button left.

Actions right.

No shadow.

Bottom divider only.

---

# Bottom Sheet

Radius

24

Handle

Neutral 300

Max height

90%

Shadow Level 1

---

# Dialog

Radius

20

Padding

24

Buttons aligned right

Shadow Level 2

---

# Chips

Only for filtering.

Height

36

Radius

999

Selected

Primary background

White text

---

# Badges

Red

Small

Circular

Maximum

99+

---

# Notifications

Use color intentionally.

Emergency

Red

Warning

Amber

Information

Blue

Success

Green

General

Neutral

---

# Maps

Maps are edge-to-edge.

Floating controls.

Floating cards.

Bottom sheet interactions.

Never place buttons directly on maps.

---

# Motion

Animations should be subtle.

Default

200ms

Large

300ms

Spring only for:

- bottom sheets
- cards
- navigation

Never animate everything.

---

# Loading

Skeleton loaders preferred.

Avoid spinners when loading lists.

Full-screen loading only during authentication.

---

# Empty States

Illustration optional.

Large title.

Short description.

Primary action.

Secondary action optional.

---

# Accessibility

Minimum touch target

48x48

Contrast

WCAG AA minimum.

Support

Dynamic Type

Screen readers

Reduced Motion

Dark Mode

---

# Dark Mode

Do not invert colors.

Use dedicated palette.

Surfaces become darker.

Maintain hierarchy using contrast.

Never use pure black.

---

# Responsive Rules

Tablet

Increase margins.

Keep component widths readable.

Never stretch cards edge-to-edge.

---

# Design Tokens

```ts
radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24
}

spacing = {
  4,
  8,
  12,
  16,
  20,
  24,
  32,
  40,
  48,
  64
}

elevation = {
  none,
  low,
  medium
}

transition = {
  fast:150,
  normal:200,
  slow:300
}
```

---

# Component Principles

Every component must satisfy:

- Accessible
- Predictable
- Minimal
- Touch friendly
- Keyboard friendly
- Consistent
- High performance

---

# AI Implementation Rules

When creating new UI:

1. Reuse existing components.
2. Never invent colors.
3. Never invent spacing values.
4. Prefer borders over shadows.
5. Use shadows only for overlays.
6. Never exceed three visual hierarchy levels.
7. Prioritize readability.
8. Use consistent corner radii.
9. Follow the typography scale exactly.
10. Every screen must feel like it belongs to the same application.

---

# Final Principle

If a design decision is uncertain, ask:

> "Would this feel at home in Citizen, Uber, or Apple Wallet?"

If the answer is **no**, redesign it.
