---
name: Academic Examination System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 44px
  display-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  code-md:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 22px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an unyielding environment of institutional integrity, cognitive calm, and absolute clarity for high-stakes online examinations in Vietnamese higher education. Under timed academic pressure, candidate fatigue and stress are mitigated through an architectural, restrained layout inspired by distinguished academic publishing and state examination standards.

The visual style blends institutional minimalism with high-precision information design:
- Zero decorative overhead: No ambient gradients, no glassmorphism, and no ornamental illustrations. Every pixel directly serves comprehension and cognitive focus.
- Native Vietnamese typographic balance: Deep vertical tracking and deliberate line heights crafted specifically to handle complex compound diacritics (dấu thanh, dấu mũ, dấu móc) cleanly without clipping or cramped ascenders.
- Structured sobriety: Deep university navy anchors navigation and institutional credibility, while balanced cool slates structure dense question sets, proctoring controls, and verification panels.

## Colors

The palette is engineered for prolonged visual stamina and instant status identification during timed assessments.

### Institutional Anchor & Action
- **Primary Navy (`#0F172A` / `#1E293B`)**: The institutional anchor. Used for primary navigation headers, major section headings, key action triggers, and active panel borders.
- **Academic Blue (`#1D4ED8`)**: The functional interaction color. Used for current question selection highlights, active radio/checkbox states, and secondary interactive commands.

### Functional Verification & Status Tokens
Functional states avoid ambiguous pastels in favor of high-contrast, universally accessible indicators:
- **Success / Answered (`#059669`)**: Indicates saved responses, verified identity, and submitted exam packets.
- **Attention / Flagged (`#D97706`)**: Denotes questions marked for review (Gắn cờ xem lại) and passive advisory notices.
- **Critical / Timer Warning (`#DC2626`)**: Reserved for time-expiration warnings (< 5 minutes remaining), proctoring alerts, and validation errors.

### Structural Neutrals
- **Canvas Base (`#F8FAFC`)**: Soft, non-glare background preventing ocular strain during 90- to 180-minute exam sessions.
- **Surface Elevation (`#FFFFFF`)**: Pure white reserved strictly for question cards, paper sheets, and modal dialogues.
- **Border Grayscale (`#E2E8F0` / `#CBD5E1`)**: Crisp, low-noise dividers separating question metadata, choices, and navigation matrices.
- **Typographic Slate (`#0F172A` primary, `#334155` body, `#64748B` supporting metadata)**: Rigorously calibrated for AAA contrast compliance against both `#FFFFFF` and `#F8FAFC`.

## Typography

Typographic scale and vertical pacing are tuned to the structural properties of **Be Vietnam Pro**. Because Vietnamese orthography relies on stacked tone markers (e.g., *ẩ, ễ, ặ*), standard Latin line heights lead to visual collision or clipping. All typographic roles enforce an elevated line-height-to-font-size ratio (minimum 1.5x on body text, 1.35x on display headers).

### Hierarchy & Application
- **Display & Section Headers**: Used sparingly for exam module identification, candidate authentication screens, and final submission receipts. Bold weights anchor visual orientation immediately.
- **Body (`body-lg`, `body-md`)**: Reserved for question stems, reading comprehension passages, and multi-line multiple-choice prompts. Set in standard weights (`400`) to maximize scan speed without visual bulk.
- **Monospace Integration (`code-md`)**: Fixed-pitch font stacks (`Courier Prime`, `JetBrains Mono`, or system monospaced) are mandated for candidate identification numbers (Mã số sinh viên), verification hashes, countdown clocks, and computer science code prompt blocks.

## Layout & Spacing

The layout is built upon an asymmetric split architecture optimized for intense desktop-first test taking, while collapsing systematically on smaller viewport configurations.

### Grid Framework
- **Desktop (>= 1024px)**: 12-column layout partitioned into an 8-column main examination pane (displaying the active question, passage text, and input choices) and a persistent 4-column test navigation sidebar (containing the visual question grid, countdown clock, candidate proctor status, and quick-save triggers).
- **Tablet (768px - 1023px)**: Question area expands to full width; the question matrix collapses into a drawer anchored to the top or side via a sticky summary strip.
- **Mobile (< 768px)**: 4-column fluid layout with pinned bottom navigation containing Previous, Next, and Question Drawer toggles.

### Spacing Cadence
- Content elements maintain strict mathematical relationships via an 8-point base rhythm. Padding inside question containers uses `space-xl` (40px desktop / 24px mobile) to create focus breathing room.
- Inter-choice spacing for options (A, B, C, D) adheres to `space-sm` (8px) for compact layouts and `space-md` (16px) for paragraph-length choices.

## Elevation & Depth

This system intentionally eliminates blurred drop shadows, diffuse glows, and pseudo-3D skeuomorphism. Depth is communicated strictly through structural layering, border containment, and contrasting surface tones.

### Elevation Levels
- **Ground Floor (`Level 0`)**: `#F8FAFC`. The canvas background behind all content containers.
- **Surface Layer (`Level 1`)**: `#FFFFFF` with a crisp 1px solid border (`#E2E8F0`). Used for question answer cards, test review tables, and persistent sidebars.
- **Interactive Focus (`Level 2`)**: Active question cards or selected answer rows receive a 1px border colored in Navy (`#0F172A`) or Academic Blue (`#1D4ED8`) along with a subtle, non-diffuse 2px offset border outline (`ring`).
- **Modal & Warning Overlay (`Level 3`)**: Time expiration modals and submission confirmations use `#FFFFFF` surrounded by a sharp, high-contrast dark border (`#0F172A`) over an opaque darkened backdrop (`#0F172A` at 60% opacity). No blurred backdrop filters are used.

## Shapes

The geometric personality is architectural and disciplined, defined by `roundedness: 1`. 

- Standard inputs, buttons, status badges, and table headers employ a concise 4px (`0.25rem`) radius.
- Cards, question panels, and dialog sheets use an 8px (`0.5rem`, `rounded-lg`) radius.
- Pill shapes are prohibited across the system to maintain a professional, paper-adjacent examination environment. Square corners and restrained radii communicate precision, legibility, and technical reliability.

## Components

### Buttons
- **Primary Exam Trigger**: Solid `#0F172A` background, `#FFFFFF` text, 4px border radius, 44px minimum touch height. Used for "Nộp bài thi" (Submit Exam) and "Lưu bài" (Save Response). Hover transitions to `#1E293B`.
- **Navigation Controls**: Outlined `#E2E8F0` border, `#0F172A` text, `#FFFFFF` surface. Used for "Câu trước" (Previous) and "Câu tiếp theo" (Next).
- **Destructive/Critical**: `#DC2626` background, `#FFFFFF` text. Used exclusively for forced exit confirmations.

### Status Badges (Huy hiệu trạng thái)
Badges feature an architectural outline style with 4px corner radius, bold condensed text, and explicit color coding:
- **Chưa làm (Unanswered)**: Border `#CBD5E1`, text `#64748B`, background `#F8FAFC`.
- **Đã lưu (Saved/Answered)**: Border `#059669`, text `#059669`, background `#ECFDF5`.
- **Đã gắn cờ (Flagged for Review)**: Border `#D97706`, text `#D97706`, background `#FFFBEB`.
- **Đang diễn ra (In Progress)**: Border `#1D4ED8`, text `#1D4ED8`, background `#EFF6FF`.
- **Đã nộp (Submitted)**: Solid `#0F172A`, text `#FFFFFF`.

### Question Grid Matrix (Bảng điều hướng câu hỏi)
A compact array of numbered square cells (36px × 36px) mapping the entire examination paper:
- Active question is outlined with a 2px `#0F172A` focus border.
- Answered questions render in filled `#ECFDF5` with `#059669` text.
- Flagged questions display an amber corner indicator tab.
- Hover displays the question point value and completion state.

### Countdown Timer (Bộ đếm thời gian)
- Fixed high-visibility panel. Monospaced font display (`tabular-nums`), bold weight.
- Normal state (> 10 mins): `#0F172A` on `#FFFFFF` card.
- Warning state (5-10 mins): Amber accent text `#D97706`.
- Critical state (< 5 mins): Solid `#FEF2F2` background with `#DC2626` text and crisp `#DC2626` border.

### Radio & Checkbox Choices
Full-width row selection targets (minimum 48px height) with a 4px radius and 1px `#E2E8F0` border. When selected, the entire row gains an `#EFF6FF` background with an authoritative `#1D4ED8` 1.5px border, clearly eliminating ambiguity around selected responses.

### Data Tables
Tables for grading rubrics and candidate registries utilize `#F8FAFC` column header cells with 1px `#E2E8F0` interior borders, 12px vertical cell padding, and alternating row fills for effortless reading across wide datasets.