---
version: alpha
colors:
  canvas: "#101316"
  surface: "#1B2025"
  text: "#F5F1E8"
  muted: "#A7B0B8"
  accent: "#F4B860"
  danger: "#E06C5A"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
rounded:
  card: "12px"
  control: "8px"
spacing:
  page: "32px"
  gap: "16px"
components:
  card:
    background: "#1B2025"
    radius: "12px"
  button:
    radius: "8px"
---

## Overview

Films Catalog is a product interface for browsing and saving films. It should feel like a well-kept late-night cinema archive: cinematic, focused, and readable rather than a generic streaming dashboard. The signature is a restrained amber accent against graphite surfaces; all other elements stay quiet.

## Colors

Use canvas for the page, surface for cards, text for primary content, muted for metadata, and accent only for links and primary actions. Danger is reserved for removing a favorite.

## Typography

Film titles use the display serif. Descriptions, navigation, form labels, and controls use the body sans-serif for clarity.

## Layout

Use a single centered column with a responsive card grid. Keep 32px desktop page padding, reduce it on narrow screens, and preserve 16px spacing between cards.

## Elevation & Depth

Static cards use contrast and a thin border instead of heavy shadows. Hover may lift a card slightly without changing layout.

## Shapes

Cards use 12px rounding; controls use 8px rounding. Avoid pills except for small status labels.

## Components

Use native links for film navigation and native buttons for actions. Every interactive control has visible keyboard focus and a stable pending state.

## Do's and Don'ts

Do keep the interface content-first and use the amber accent sparingly. Do not add decorative gradients, carousels, or autoplay motion.
