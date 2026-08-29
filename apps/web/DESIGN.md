# Deciball — Style Reference
> Velvet library with a single blue spark. A vast dark room where a single italic serif headline commands attention and one cyan glow signals action.

**Theme:** dark

Deciball operates as a dark editorial canvas draped in near-black with a single electric teal pulse. The visual identity is anchored by Instrument Serif at dramatic scale — italicized headlines ranging from 28px to 96px create a magazine-cover weight, with the brand wordmark blooming across the hero as ghostly gray type. DM Mono handles the technical/UI chrome: labels, tags, metadata, timestamps, and structural annotations that read as system metadata rather than copy. Surfaces are matte and paper-thin against the void; the primary action button and the teal accent provide the only points of visual weight. The mood is late-night listening session meets luxury print — confident, quiet, and typographically opinionated.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Electric Cyan | `#19d0e8` | `--color-electric-cyan` | Accent text, accent borders, active playback indicators, the now-playing glow, vote highlights — the only chromatic pulse in an otherwise achromatic system |
| Sky Signal | `#44ccff` | `--color-sky-signal` | Secondary cyan for gradient stops and hover states |
| Deep Teal | `#062f34` | `--color-deep-teal` | Card surface base, gradient shadow stop — anchors teal accents in darkness |
| Void Black | `#000000` | `--color-void-black` | Page canvas, primary background — the uninterrupted dark field |
| Obsidian | `#010101` | `--color-obsidian` | Alternative near-black surface when the canvas shifts fractionally off-pure-black |
| Midnight Surface | `#191919` | `--color-midnight-surface` | Elevated surface — cards, panels, sidebar, overlay containers sitting one step above the void |
| Graphite | `#282828` | `--color-graphite` | Mid-tier surface and neutral button fills — the interactive control surface |
| Charcoal | `#363636` | `--color-charcoal` | Secondary card surface for stacked or grouped containers |
| Slate | `#3f3f3f` | `--color-slate` | Deep shadow surface, queue item hover, tertiary elevation |
| Steel Gray | `#7f7f7f` | `--color-steel-gray` | Supporting neutral for secondary UI, dividers, timestamps, and muted labels. Do not promote it to the primary CTA color |
| Paper White | `#ffffff` | `--color-paper-white` | Primary text, light surface fills, high-contrast elements |
| Ghost Gray | `#c0c0c0` | `--color-ghost-gray` | Subtle highlight wash, placeholder text, and faint surface luminosity |

## Tokens — Typography

### Instrument Serif — Display and heading — italicized editorial serif at dramatic scale. Section headlines land at 48–96px. Negative letter-spacing tightens the serif into compact magazine-display density. · `--font-instrument-serif`
- **Substitute:** Playfair Display, EB Garamond, Cormorant Garamond
- **Weights:** 400
- **Sizes:** 28px, 32px, 40px, 48px, 64px, 72px, 96px
- **Line height:** 1.0–1.3
- **Letter spacing:** -0.04em at 64px and above; -0.03em at 48px; 0.008em at 32px
- **Role:** Display and heading — italicized editorial serif at dramatic scale. The brand wordmark and page titles. Negative letter-spacing tightens the serif into compact magazine-display density.

### DM Mono — Mono UI chrome — labels, tags, metadata, button text, timestamps, badge labels, queue position numbers, chat usernames, space codes, keyboard shortcuts. Reads as system metadata. · `--font-dm-mono`
- **Substitute:** JetBrains Mono, IBM Plex Mono, Space Mono
- **Weights:** 400
- **Sizes:** 10px, 12px, 14px, 15px, 16px, 18px, 20px
- **Line height:** 1.2–1.5
- **Letter spacing:** -0.01em at 20px; 0.015–0.021em at 10–14px (slight positive tracking for tag/caps usage)
- **Role:** Mono UI chrome — labels, tags, metadata, button text, timestamps, badge labels, queue numbers, chat usernames. Reads as system metadata.

### Geist — Body text — 17px single weight for paragraphs, descriptions, chat messages, and longer-form content. The slightly larger-than-default body size (17 vs 16) gives copy room to breathe against the dense UI chrome. · `--font-geist`
- **Substitute:** Inter, system-ui
- **Weights:** 400
- **Sizes:** 17px
- **Line height:** 1.4
- **Role:** Body text — 17px single weight for paragraphs, descriptions, and chat messages.

### system-ui — Fallback body and link text — appears in utility contexts where a system font is appropriate · `--font-system-ui`
- **Substitute:** Inter, -apple-system, Segoe UI
- **Weights:** 400
- **Sizes:** 16px
- **Line height:** 1.5
- **Role:** Fallback body and link text — appears in utility contexts where a system font is appropriate

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 10px | 1.4 | 0.21px | `--text-caption` |
| body | 17px | 1.4 | — | `--text-body` |
| subheading | 20px | 1.2 | -0.2px | `--text-subheading` |
| heading-sm | 32px | 1.1 | 0.26px | `--text-heading-sm` |
| heading | 48px | 1.1 | -1.44px | `--text-heading` |
| heading-lg | 72px | 1 | -2.16px | `--text-heading-lg` |
| display | 96px | 0.9 | -3.84px | `--text-display` |

## Tokens — Spacing & Shapes

**Density:** compact

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 5 | 5px | `--spacing-5` |
| 6 | 6px | `--spacing-6` |
| 8 | 8px | `--spacing-8` |
| 9 | 9px | `--spacing-9` |
| 10 | 10px | `--spacing-10` |
| 11 | 11px | `--spacing-11` |
| 12 | 12px | `--spacing-12` |
| 14 | 14px | `--spacing-14` |
| 16 | 16px | `--spacing-16` |
| 18 | 18px | `--spacing-18` |
| 19 | 19px | `--spacing-19` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 72 | 72px | `--spacing-72` |

### Border Radius

| Element | Value |
|---------|-------|
| tags | 100000px |
| cards | 18px |
| large | 12px |
| small | 4px |
| medium | 8px |
| buttons | 100000px |
| avatars | 100000px |
| album-art | 12px |
| player-bar | 18px |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| subtle | `rgba(0, 0, 0, 0.7) 3px 3px 2px 0px inset, rgba(255, 255, ...` | `--shadow-subtle` |
| sm | `rgba(0, 0, 0, 0.25) 0px 4px 4px 0px, rgba(255, 255, 255, ...` | `--shadow-sm` |
| subtle-2 | `rgba(0, 0, 0, 0.63) 0px 0px 0px 1px` | `--shadow-subtle-2` |
| md | `rgb(14, 93, 102) 6px 6px 10px 0px inset, rgba(255, 255, 2...` | `--shadow-md` |

### Layout

- **Page max-width:** 1200px
- **Section gap:** 80px
- **Card padding:** 24px
- **Element gap:** 10px

## Components

### Hero Section (Landing)
**Role:** Brand entrance and space creation

The word 'Deciball' rendered in Instrument Serif italic at 72–96px, white (#ffffff), with negative letter-spacing. A ghosted 'Deciball' wordmark in #c0c0c0 at large scale may sit as a background watermark. Below the headline: a subline in Geist 17px, #7f7f7f — "Sync the Beat, Share the Vibe." A space-name input field (Midnight Surface background, 18px radius, DM Mono 14px placeholder text in #7f7f7f) with a primary "Jam Now" pill button (Graphite #282828 fill, Paper White text, DM Mono 14px, 100000px radius). The hero sits on Void Black with generous vertical padding.

### Space Card
**Role:** Space preview tile on the landing page and dashboard

Midnight Surface (#191919) background, 18px radius, 24px padding. Contains: space name in Instrument Serif italic 28–32px white, creator info in DM Mono 12px #7f7f7f, listener count badge in DM Mono 10px with Electric Cyan (#19d0e8) text. A subtle 1px border in Graphite (#282828). On hover: border shifts to #3f3f3f. No heavy shadows — elevation is communicated through border contrast against the void.

### Now-Playing Bar
**Role:** Persistent bottom player strip

Full-width bar, Midnight Surface (#191919) background, 18px top radius (anchored to viewport bottom). Contains: album art thumbnail (48px square, 12px radius), song title in Geist 17px white, artist in DM Mono 12px #7f7f7f, transport controls (prev/play-pause/next) as Paper White icons on transparent background, a thin progress bar with Electric Cyan (#19d0e8) fill on Graphite (#282828) track, and a volume slider. The play/pause button is the largest control — 40px hit target. A subtle cyan glow (0 0 12px rgba(25, 208, 232, 0.15)) behind the album art when music is playing.

### Queue Panel
**Role:** Upcoming tracks list

Midnight Surface (#191919) panel, 18px radius. Header: "Queue" in DM Mono 14px, letter-spacing 0.015em, #7f7f7f. Each queue item: Graphite (#282828) surface, 8px radius, 12px padding. Track name in Geist 17px white, artist in DM Mono 12px #7f7f7f, duration in DM Mono 12px #7f7f7f right-aligned. Queue position number in DM Mono 10px Electric Cyan. Drag handle (six dots) in #3f3f3f, visible on hover. Upvote count badge: DM Mono 10px, Electric Cyan text. Remove button (admin only): Ghost button style, appears on hover.

### Search Overlay
**Role:** Track search and add-to-queue

Midnight Surface (#191919) panel or modal, 18px radius. Search input: Graphite (#282828) fill, DM Mono 14px placeholder "#7f7f7f", Paper White text, 100000px radius, Electric Cyan left border on focus. Results list: each result is a row with album art (40px, 8px radius), track title in Geist 17px white, artist in DM Mono 12px #7f7f7f, duration in DM Mono 12px #7f7f7f. Add button: Ghost button style (transparent, 1px #3f3f3f border, DM Mono 12px). Batch-select mode: selected items get a 1px Electric Cyan border, "Add N tracks" pill button appears at bottom.

### Chat Panel
**Role:** Real-time conversation within a space

Midnight Surface (#191919) panel, 18px radius. Header: "Chat" in DM Mono 14px, letter-spacing 0.015em, #7f7f7f, with unread count badge (Electric Cyan background, Void Black text, DM Mono 10px, 100000px radius). Messages: avatar (28px, fully rounded) + username in DM Mono 12px #7f7f7f + timestamp in DM Mono 10px #3f3f3f. Message body in Geist 17px white. Admin badge: DM Mono 10px, Electric Cyan text, 1px Electric Cyan border, 100000px radius. Input: Graphite (#282828) fill, Geist 17px, 100000px radius, "Type a message…" placeholder in #7f7f7f.

### User Avatar
**Role:** Identity indicator across chat, space, and profile

Circular (100000px radius). 28px in chat, 32px in space member list, 80px on profile page. When no image: Graphite (#282828) fill with user initials in DM Mono, Paper White text. When image: object-fit cover, no border. Admin variant: 2px Electric Cyan ring.

### Role Badge
**Role:** Admin/Listener indicator

DM Mono 10px, uppercase, letter-spacing 0.02em. Admin: Electric Cyan (#19d0e8) text, 1px Electric Cyan border, transparent background, 100000px radius, 4px vertical / 8px horizontal padding. Listener: Steel Gray (#7f7f7f) text, 1px #3f3f3f border. These are small — they annotate, they don't dominate.

### Sign-In Page
**Role:** Authentication entry

Void Black canvas. Centered card: Midnight Surface (#191919), 18px radius, 24px padding, max-width 400px. Headline "Sign in" in Instrument Serif italic 48px white. Provider buttons (Google, GitHub, etc.): Graphite (#282828) fill, DM Mono 14px white text, provider icon left-aligned, 100000px radius, full-width. Divider: 1px Graphite line with "or" in DM Mono 10px #7f7f7f centered. Email input + password input: Graphite fill, DM Mono 14px, 8px radius. Submit button: Graphite fill, DM Mono 14px, 100000px radius.

### Profile Page
**Role:** User identity and settings

Void Black canvas. Large avatar (80px, fully rounded) centered or left-aligned. Display name in Instrument Serif italic 40px white. Username in DM Mono 16px #7f7f7f prefixed with "@". Email in DM Mono 14px #7f7f7f with verified badge (Electric Cyan checkmark). Edit fields: label in DM Mono 12px #7f7f7f uppercase letter-spaced, input in Graphite fill, Geist 17px, 8px radius. Save button: Graphite fill, DM Mono 14px, 100000px radius. Join date in DM Mono 10px #3f3f3f.

### Space Header
**Role:** Space name and controls within the listening room

Space name in Instrument Serif italic 32–40px white. Listener count: DM Mono 12px, Electric Cyan text, with a dot indicator. Share button: Ghost button style (transparent, 1px border, DM Mono 12px, "Copy Link"). Admin controls (if host): Ghost buttons for settings. The header sits at the top of the space view on Void Black, with a subtle 1px Graphite bottom border.

### Download Button
**Role:** Track download CTA

Graphite (#282828) fill, Paper White text and download icon, DM Mono 12px. Fully rounded (100000px radius). ~120px wide × 32px tall. Minimal — no border, no shadow. Appears on the now-playing bar or in a modal.

### Ghost Button
**Role:** Secondary text button

Transparent background, 1px #3f3f3f border, Paper White text in DM Mono 12px, 8px radius or 100000px radius (context-dependent: pill for standalone actions, rounded-rect for inline actions), 8–10px vertical padding, 14–16px horizontal padding. On hover: border shifts to #7f7f7f.

### Primary Button
**Role:** Primary action (Jam Now, Save, Add to Queue)

Graphite (#282828) fill, Paper White text in DM Mono 14px, 100000px radius, 10–12px vertical padding, 20–24px horizontal padding. On hover: background shifts to #363636. No gradient, no shadow — weight comes from fill contrast against the void.

### Toast Notification
**Role:** Ephemeral feedback (copied link, track added, error)

Midnight Surface (#191919), 12px radius, DM Mono 14px. Success: Electric Cyan left border accent. Error: no accent (just the message). Auto-dismiss after 3s. Bottom-right positioned.

## Do's and Don'ts

### Do
- Use Instrument Serif italic at 48–96px for page and section headlines — the editorial weight is the brand's primary signature
- Use DM Mono for all UI chrome, labels, buttons, badges, timestamps, and metadata — never use a proportional font for system annotations
- Apply the teal accent (#19d0e8) at most 2–3 times per viewport — it should feel like a spark, not a wash: now-playing glow, queue position, admin badge
- Use fully rounded (100000px) radius for all pills, tags, badges, avatars, and primary buttons
- Use 18px radius for cards, panels, and the player bar — generous rounding signals approachability
- Use 12px radius for album art thumbnails and secondary containers
- Keep surfaces matte and borderless where possible — elevation is communicated through background value steps (#000 → #191919 → #282828), not shadows
- Let the void breathe — generous padding and section gaps (80px) are essential to the editorial feel

### Don't
- Do not use bright or warm accent colors — the system is monastically dark with one cold teal point
- Do not use heavy drop shadows on cards or panels — save complex shadows for the rare physical-object metaphor
- Do not use Inter, a geometric sans, or the existing Poppins for headings — the italic serif is non-negotiable brand identity
- Do not use small heading sizes (below 28px) for Instrument Serif — it needs scale to function
- Do not apply the teal as a background fill on buttons or large surfaces — it belongs in text, thin borders, small badges, and the now-playing glow
- Do not use sharp corners (< 4px radius) on interactive elements — the system curves everything
- Do not center-align body paragraphs — left-align for editorial column behavior, center only for the hero headline and testimonials
- Do not use glassmorphism, blur effects, or gradient borders — the current codebase uses these heavily; they conflict with the matte-surface, print-editorial identity
- Do not add glow/glitch/neon effects to text — the typography speaks through scale and italic weight, not decoration

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Void | `#000000` | Page canvas, unbroken background |
| 1 | Midnight | `#191919` | Cards, panels, player bar, sidebar, chat panel |
| 2 | Graphite | `#282828` | Interactive surfaces, button fills, inputs, queue items |
| 3 | Charcoal | `#363636` | Hover states, nested containers, grouped content |
| 4 | Paper | `#ffffff` | Primary text, high-contrast icons |

## Elevation

Elevation is communicated almost entirely through **background value steps**, not shadows. The eye distinguishes #191919 from #000000 without any box-shadow. Reserve complex shadows for at most one hero element per page.

- **Standard card:** No shadow. 1px Graphite (#282828) border or borderless against the void.
- **Raised card (rare):** `rgba(0, 0, 0, 0.63) 0px 0px 0px 1px`
- **Player bar:** No shadow. Elevated through Midnight Surface against the Void canvas.
- **Modal overlay:** Background dim `rgba(0, 0, 0, 0.8)`, modal card is Midnight Surface with no shadow.

## Imagery

Imagery is minimal and music-centric. Album art is the dominant visual — cropped square, 12px radius, displayed at the sizes dictated by context (48px in player bar, 40px in search results, 80px in now-playing expanded view). No lifestyle photography, no abstract gradients as decoration, no background images. The album art IS the color — it provides the only organic imagery in an otherwise typographic system. User avatars are the secondary image type, always circular, always small.

## Layout

Full-bleed dark canvas with content areas constrained to ~1200px max width where appropriate. The music space view is a multi-panel layout: queue panel left, main content (now-playing + space info) center, chat panel right — all on a Void Black canvas with Midnight Surface panels. The landing page is a centered single-column layout with generous whitespace. The player bar is a persistent full-width strip anchored to the viewport bottom. Navigation is minimal — the space view IS the app; getting in and out should be the only navigation concern.

## Typography Pairing Philosophy

The system uses a three-font editorial model: Instrument Serif (display), DM Mono (UI/system metadata), and Geist (body/content). The serif carries voice and personality; the mono carries function and precision; the sans carries readable prose. Never mix these roles. Headlines are always Instrument Serif italic — the italic is a brand marker, not a style option. Mono text often uses positive letter-spacing (0.015–0.021em) at small sizes to give labels a deliberate, spaced-out quality. Serif text always uses negative tracking at display sizes to tighten the magazine-display feel.

## Gradient System

Gradients are used sparingly. The only sanctioned gradient is the **teal signal gradient** — `linear-gradient(#19d0e8, #062f34)` — and it appears only as a subtle accent (e.g., a thin progress bar fill, a now-playing ambient glow). It is never used as a card background, button fill, or border. The current codebase's gradient borders and glassmorphic backgrounds are replaced with solid matte surfaces.

## Agent Prompt Guide

**Quick Color Reference**
- text: #ffffff
- background: #000000
- card surface: #191919
- border / hairline: #282828
- accent: #19d0e8
- primary action fill: #282828
- muted text: #7f7f7f
- placeholder text: #c0c0c0

**Component Prompts**

1. **Landing hero with space creation**: Black (#000000) full-bleed background. "Deciball" in Instrument Serif italic, 72px, #ffffff, letter-spacing -0.04em. Subline "Sync the Beat, Share the Vibe" in Geist 17px, #7f7f7f. Space-name input: #191919 fill, 18px radius, DM Mono 14px #7f7f7f placeholder. "Jam Now" pill button: #282828 fill, DM Mono 14px #ffffff, 100000px radius.

2. **Now-playing bar**: Full-width, #191919 background, 18px top radius. Album art 48px square, 12px radius with subtle cyan glow when playing. Title in Geist 17px white, artist in DM Mono 12px #7f7f7f. Transport icons in white. Progress bar: #282828 track, #19d0e8 fill, 4px height, 100000px radius. Volume slider same treatment.

3. **Queue panel**: #191919 panel, 18px radius. "Queue" header in DM Mono 14px #7f7f7f, letter-spacing 0.015em. Items: #282828 surface, 8px radius, 12px padding. Track name Geist 17px white, artist DM Mono 12px #7f7f7f, position number DM Mono 10px #19d0e8. Drag handle #3f3f3f, visible on hover.

4. **Chat panel**: #191919 panel, 18px radius. Messages: 28px circular avatar, username DM Mono 12px #7f7f7f, timestamp DM Mono 10px #3f3f3f, body Geist 17px white. Admin badge: DM Mono 10px #19d0e8, 1px #19d0e8 border, 100000px radius. Input: #282828 fill, Geist 17px, 100000px radius.

5. **Space card**: #191919 fill, 18px radius, 24px padding, 1px #282828 border. Space name Instrument Serif italic 28px white. Creator DM Mono 12px #7f7f7f. Listener count DM Mono 10px #19d0e8. Hover: border shifts to #3f3f3f.

## Similar Brands

- **Linear** — Same dark canvas with generous spacing, restrained accent use, and editorial product presentation
- **Vercel** — Similar near-black surfaces, mono labels for system chrome, and one cool accent against monochrome
- **Raycast** — Dark-mode productivity app with mono UI typography and a single chromatic accent for interactive elements
- **Spotify (Desktop)** — Dark surfaces, minimal chrome, album art as the primary color source, bottom player bar pattern

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-electric-cyan: #19d0e8;
  --color-sky-signal: #44ccff;
  --color-deep-teal: #062f34;
  --color-void-black: #000000;
  --color-obsidian: #010101;
  --color-midnight-surface: #191919;
  --color-graphite: #282828;
  --color-charcoal: #363636;
  --color-slate: #3f3f3f;
  --color-steel-gray: #7f7f7f;
  --color-paper-white: #ffffff;
  --color-ghost-gray: #c0c0c0;

  /* Typography — Font Families */
  --font-instrument-serif: 'Instrument Serif', ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-dm-mono: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-geist: 'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-system-ui: 'system-ui', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 10px;
  --leading-caption: 1.4;
  --tracking-caption: 0.21px;
  --text-body: 17px;
  --leading-body: 1.4;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: -0.2px;
  --text-heading-sm: 32px;
  --leading-heading-sm: 1.1;
  --tracking-heading-sm: 0.26px;
  --text-heading: 48px;
  --leading-heading: 1.1;
  --tracking-heading: -1.44px;
  --text-heading-lg: 72px;
  --leading-heading-lg: 1;
  --tracking-heading-lg: -2.16px;
  --text-display: 96px;
  --leading-display: 0.9;
  --tracking-display: -3.84px;

  /* Typography — Weights */
  --font-weight-regular: 400;

  /* Spacing */
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-11: 11px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-18: 18px;
  --spacing-19: 19px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-72: 72px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 80px;
  --card-padding: 24px;
  --element-gap: 10px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 18px;
  --radius-2xl: 24px;
  --radius-3xl: 40px;
  --radius-full: 100000px;

  /* Named Radii */
  --radius-tags: 100000px;
  --radius-cards: 18px;
  --radius-buttons: 100000px;
  --radius-avatars: 100000px;
  --radius-album-art: 12px;
  --radius-player-bar: 18px;
  --radius-inputs: 8px;

  /* Shadows — use sparingly */
  --shadow-subtle: rgba(0, 0, 0, 0.7) 3px 3px 2px 0px inset, rgba(255, 255, 255, 0.25) 3px 2px 2px 0px;
  --shadow-sm: rgba(0, 0, 0, 0.25) 0px 4px 4px 0px, rgba(255, 255, 255, 0.25) 1px 1px 2px 0px, rgba(0, 0, 0, 0.5) 1px 1px 1px 0px inset, rgba(0, 0, 0, 0.7) 2px 2px 12px 0px inset;
  --shadow-subtle-2: rgba(0, 0, 0, 0.63) 0px 0px 0px 1px;
  --shadow-md: rgb(14, 93, 102) 6px 6px 10px 0px inset, rgba(255, 255, 255, 0.2) 4px 4px 4px 0px, rgba(255, 255, 255, 0.25) 1px 1px 2px 0px;

  /* Surfaces */
  --surface-void: #000000;
  --surface-midnight: #191919;
  --surface-graphite: #282828;
  --surface-charcoal: #363636;
  --surface-paper: #ffffff;

  /* Now-playing glow */
  --glow-playing: 0 0 12px rgba(25, 208, 232, 0.15);
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-electric-cyan: #19d0e8;
  --color-sky-signal: #44ccff;
  --color-deep-teal: #062f34;
  --color-void-black: #000000;
  --color-obsidian: #010101;
  --color-midnight-surface: #191919;
  --color-graphite: #282828;
  --color-charcoal: #363636;
  --color-slate: #3f3f3f;
  --color-steel-gray: #7f7f7f;
  --color-paper-white: #ffffff;
  --color-ghost-gray: #c0c0c0;

  /* Typography */
  --font-instrument-serif: 'Instrument Serif', ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  --font-dm-mono: 'DM Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --font-geist: 'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-system-ui: 'system-ui', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 10px;
  --leading-caption: 1.4;
  --tracking-caption: 0.21px;
  --text-body: 17px;
  --leading-body: 1.4;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: -0.2px;
  --text-heading-sm: 32px;
  --leading-heading-sm: 1.1;
  --tracking-heading-sm: 0.26px;
  --text-heading: 48px;
  --leading-heading: 1.1;
  --tracking-heading: -1.44px;
  --text-heading-lg: 72px;
  --leading-heading-lg: 1;
  --tracking-heading-lg: -2.16px;
  --text-display: 96px;
  --leading-display: 0.9;
  --tracking-display: -3.84px;

  /* Spacing */
  --spacing-5: 5px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-9: 9px;
  --spacing-10: 10px;
  --spacing-11: 11px;
  --spacing-12: 12px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-18: 18px;
  --spacing-19: 19px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-72: 72px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 18px;
  --radius-2xl: 24px;
  --radius-3xl: 40px;
  --radius-full: 100000px;

  /* Shadows */
  --shadow-subtle: rgba(0, 0, 0, 0.7) 3px 3px 2px 0px inset, rgba(255, 255, 255, 0.25) 3px 2px 2px 0px;
  --shadow-sm: rgba(0, 0, 0, 0.25) 0px 4px 4px 0px, rgba(255, 255, 255, 0.25) 1px 1px 2px 0px, rgba(0, 0, 0, 0.5) 1px 1px 1px 0px inset, rgba(0, 0, 0, 0.7) 2px 2px 12px 0px inset;
  --shadow-subtle-2: rgba(0, 0, 0, 0.63) 0px 0px 0px 1px;
  --shadow-md: rgb(14, 93, 102) 6px 6px 10px 0px inset, rgba(255, 255, 255, 0.2) 4px 4px 4px 0px, rgba(255, 255, 255, 0.25) 1px 1px 2px 0px;
}
```
