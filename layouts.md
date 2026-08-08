# layout.md

> Defines the structural layout rules for the Government Mobile Application.
>
> This document controls **where things are placed**, **how screens are built**, and **how users move through the application**.
>
> It does **NOT** define colors or typography (see `styles.md`).
>
> Every generated screen must follow these rules.

---

# Design Principles

The layout should feel like modern consumer applications such as:

- Citizen
- Uber
- inDrive
- Apple Wallet
- Google Wallet

The UI should be:

- spacious
- intentional
- easy to scan
- thumb friendly
- predictable

Every screen should have one obvious purpose.

---

# Screen Hierarchy

Every screen should follow this structure.

```
Safe Area

App Bar

Primary Content

Optional Floating Elements

Bottom Navigation / Bottom Action
```

Never invent additional structural regions.

---

# Safe Area

Always respect:

- Status Bar
- Dynamic Island / Notch
- Camera Cutouts
- Gesture Navigation
- Home Indicator

Never place content under unsafe regions.

---

# Page Width

Content should never touch screen edges.

Horizontal Padding

```
20dp
```

Tablet

```
32dp
```

Large Tablet

```
48dp
```

---

# Vertical Rhythm

Top spacing

```
20
```

Between sections

```
32
```

Between cards

```
16
```

Between controls

```
12
```

Between text

```
8
```

Never use arbitrary spacing.

---

# Screen Types

The app only uses these layouts.

---

## Dashboard

Structure

```
App Bar

Greeting

Primary Actions

Information Cards

Recent Activity

Bottom Navigation
```

Dashboard should never scroll horizontally.

---

## List Screen

Structure

```
App Bar

Search

Filters

Scrollable List

Bottom Navigation
```

Lists occupy the remaining height.

---

## Detail Screen

Structure

```
App Bar

Hero Section

Information Sections

Action Area
```

Actions remain visible when appropriate.

---

## Form Screen

Structure

```
App Bar

Progress (optional)

Form Fields

Supporting Information

Primary Action
```

Primary button remains pinned near the bottom.

---

## Map Screen

Structure

```
Full Screen Map

Floating Search

Floating Controls

Bottom Sheet
```

Maps should be immersive.

---

## Authentication

Structure

```
Logo

Headline

Description

Form

Primary Button

Secondary Actions
```

Avoid unnecessary graphics.

---

# App Bar

Height

```
64dp
```

Contains

- Back Button OR Menu
- Screen Title
- Optional Actions

Never place more than 2 actions.

No shadow.

Divider only.

---

# Scroll Behavior

Scrolling should feel natural.

App bar remains visible unless intentionally collapsible.

Never create nested scrolling.

Avoid horizontal scrolling.

---

# Content Width

Maximum readable width

```
600dp
```

On tablets center content.

Never stretch forms.

---

# Cards

Cards are stacked vertically.

Never overlap cards.

Maintain equal spacing.

```
Card

16dp

Card

16dp

Card
```

---

# Sections

Every section follows:

```
Title

Description (optional)

Content
```

Spacing

```
Title

8

Description

16

Content
```

---

# Lists

Every list item aligns to the same grid.

```
Leading Icon

Title

Subtitle

Trailing Action
```

Height

```
72dp
```

Never use different list heights within one screen.

---

# Forms

Forms should feel effortless.

Pattern

```
Label

Input

Helper Text

Error
```

Never place labels inside placeholders only.

---

# Buttons

Primary actions should appear:

Bottom of screen

or

Sticky footer

Never scatter important actions.

Only one primary button per screen.

---

# Floating Action Button

Avoid FABs.

Use only if the action is universal.

Examples

✓ Report Incident

✓ New Submission

Not

✗ Save

✗ Continue

✗ Submit

---

# Bottom Navigation

Maximum

```
5
```

items.

Always visible on root screens.

Never hide labels.

---

# Bottom Sheets

Preferred over dialogs.

Use for

- actions
- filters
- quick information

Bottom sheets should feel native.

---

# Dialogs

Only for:

- destructive confirmation
- permissions
- critical warnings

Avoid dialogs for forms.

---

# Search

Always appears near the top.

Structure

```
Search

Filters (optional)

Results
```

Never place search at the bottom.

---

# Empty States

Structure

```
Illustration

Headline

Description

Primary Action
```

Center vertically when possible.

---

# Error States

Structure

```
Icon

Title

Explanation

Retry Button
```

Always explain what happened.

Never display raw server errors.

---

# Loading States

Preferred

Skeleton UI

Acceptable

Progress indicator

Avoid blocking the whole screen.

---

# Sticky Elements

Allowed

- Bottom action bar
- Map controls
- Floating search

Avoid multiple sticky components.

---

# Navigation Pattern

Root

Bottom Navigation

↓

List

↓

Detail

↓

Action

↓

Confirmation

Navigation should always move forward.

---

# Content Density

Prefer fewer elements.

Instead of

```
15 cards
```

Use

```
3 sections

with grouped information.
```

---

# Information Hierarchy

Every screen should answer:

1. Where am I?
2. What is this?
3. What can I do?
4. What happens next?

If unclear,

redesign the screen.

---

# Responsive Layout

## Phones

Single column

---

## Tablets

Centered content

Maximum width

```
600dp
```

Optional two-column dashboards.

Never create desktop layouts.

---

# Accessibility Layout Rules

Touch targets

```
48x48dp
```

Minimum spacing

```
8dp
```

Never rely solely on color.

Support dynamic font scaling.

---

# Screen Composition Checklist

Every generated screen must include:

- Safe Area
- App Bar
- Clear Title
- Consistent Padding
- Predictable Navigation
- Single Primary Action
- Proper Empty State
- Proper Loading State
- Proper Error State

---

# AI Layout Rules

When generating UI:

1. Always start with a Safe Area.
2. Use the standard App Bar.
3. Apply 20dp horizontal padding.
4. Use only approved screen layouts.
5. Never invent spacing values.
6. Keep scrolling vertical only.
7. Never use nested scrolling.
8. Prefer bottom sheets over dialogs.
9. Keep one primary action per screen.
10. Every screen should feel consistent with the rest of the application.

---

# Final Rule

The layout should disappear into the background.

Users should never think about the interface—they should instinctively know where to look, what to tap, and what comes next.

If a layout decision feels decorative rather than functional, remove it.
