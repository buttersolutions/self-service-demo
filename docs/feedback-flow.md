# Self-Service Demo: Feedback Flow (`?mode=feedback`)

This document describes the complete user journey when a prospect visits the self-service demo with `?mode=feedback`. This is the **reviews-led** flow — the guest feedback report is the centrepiece, with branding and app setup happening around it.

---

## Flow overview

```
Search → Reviews Analysis → Branding Confirmation → App Mockup → Get Started (Cal.com + OTP)
```

Progress bar labels:
```
Find your business → Your guest report → Your solution → Get the app
```

---

## Step 1 — Find your business

The user lands on a clean search screen with the Allgravy logo, a Google Places autocomplete input, and a "Get Started" button. Floating illustrations (rocket + pineapple) add visual warmth.

**The user types a business name, selects it from autocomplete, and clicks "Get Started."**

At that moment, a parallel cascade of background work fires simultaneously:

| Fetch | What it does |
|-------|-------------|
| `/api/demo/scan/analyze` (SSE) | The main pipeline — scrapes reviews, classifies them with Haiku, picks themes with Sonnet, writes the report in parallel |
| `/api/brand` | Extracts logo, brand colours, fonts, favicon from the business website via Firecrawl |
| `/api/screenshot` | Captures a website screenshot for later use |
| `/api/company/enrich` | Waterfall enrichment (company data + key people) |
| `/api/reviews` | Lightweight Apify review scrape (10 per location) |
| `/api/places/search` | Google Places chain discovery — finds other locations of the same business |
| `/api/places/details` | Fetches photos from the top 10 discovered locations |
| Instagram scraper | If the business only has a social media link instead of a website |

All of this runs in the background. The user sees none of it directly — they're watching the next screen.

---

## Step 2 — Your guest report (Reviews Analysis)

### Phase A: Stage tracker

While the pipeline runs, the user sees a clean card with a live progress tracker showing 9 stages:

1. Fetching reviews from Google
2. Categorising reviews
3. Computing insights & themes
4. Picking key themes
5. Writing findings
6. Writing strengths
7. Drafting recommendations
8. Writing executive summary
9. Assembling report

Each stage transitions from pending → active (spinning icon) → done (purple checkmark) as the SSE stream pushes events. The "Fetching reviews" stage updates its label in real-time (e.g., "Found 247 reviews").

### Phase B: Full report

When the pipeline completes, the stage tracker is replaced by the full **Guest Feedback Intelligence Report**. This includes:

- **Executive summary** — 1-2 paragraph synthesis
- **Quantitative overview** — rating distribution, trend (recent vs lifetime), owner response rate, pillar breakdown, category heatmap
- **Strengths** — what the business does well, backed by guest quotes
- **Gap Analysis: Core Findings** — the headline section. Each finding includes:
  - The pattern (what guests consistently mention)
  - Guest voice (direct quotes with star ratings)
  - Root cause analysis
  - Impact assessment
  - How it's addressed (by Allgravy)
  - **Current State → Desired State** mapping table
- **Trend analysis** — narrative on trajectory
- **Recommended interventions** — prioritised action items with pillar tags
- **References + methodology**

A **PDF download button** sits in the report header (top-right).

The report is shown for ~10 seconds (minimum) to let the user absorb it. Once that timer expires AND the background branding fetch has completed, the flow auto-advances to the next step.

---

## Step 3 — Your solution (Branding Confirmation)

This is a split-view layout:

### Left side (60%) — the report continues

The full report remains visible and scrollable. The user can keep reading while interacting with the right panel.

### Right side (40%) — slides in from the right

A white panel slides in with a brief animation. It contains:

**Bridge copy:**
> **"We've identified the patterns. Let's build your team's response."**

**Findings recap** — a compact summary of each finding's **Current State → Desired State** mappings. This cements the "here's your problem, here's the fix" value chain without repeating the full report.

**Download Report as PDF** — secondary link to grab the report before continuing.

**Branding confirmation form** (below the recap):
- Business name (editable)
- Website URL (editable)
- Brand colours (editable swatches, extracted from the website)
- Locations list (with add/remove)
- **"Confirm & Continue"** button

The user reviews/tweaks their branding details and clicks confirm.

---

## Step 4 — App Mockup

Full-viewport branded app mockup. No progress bar.

**Left side:**
- Heading: *"Here's how your team stays ahead of what guests are saying"*
- Checklist of what's included:
  1. Chat groups for each location
  2. Feeds to post important updates
  3. Todo lists to streamline operations
  4. Courses that teach what's lacking

**Right side:**
- Laptop frame showing a branded team feed (Allgravy desktop app) with the business logo, brand colours, location-specific channels, and sample posts
- Phone frame showing the mobile version
- Floating app icon with the business favicon/logo

At the bottom: a **"Get started"** button with a white gradient overlay.

---

## Step 5 — Get Started (3-step dialog)

Clicking "Get started" opens a modal dialog.

### 5a. Details form

- Full name
- Phone number (with searchable country code picker, auto-detected from location)
- Work email

Clicking **"Continue"** sends the OTP email immediately, then advances to the booking step.

### 5b. Cal.com booking ("While you wait")

> **"Code on its way — book a walkthrough while you wait"**
>
> We sent a 6-digit code to **{email}**. Pick a time for a 30-min demo, or skip ahead.

An embedded Cal.com scheduler lets the user book a demo. If they complete a booking, the dialog auto-advances (with a toast: "Demo booked — see you then!"). They can also click **"Continue to verification"** or **"Skip for now"** at any time.

The dialog widens slightly to accommodate the calendar embed.

### 5c. OTP verification

- 6-character code input (alphanumeric, monospace)
- **"Verify & Get Started"** button
- "Didn't receive a code? Resend" link

On successful verification, the user is redirected to their new Allgravy account (org-admin), fully authenticated.

---

## The value chain

Joachim's framing:

1. **Get a report** — the pipeline analyses hundreds of reviews and generates a professional intelligence report
2. **See what challenges you have** — findings with current-state → desired-state mappings make the gaps tangible
3. **Get an app that fixes it** — the branded mockup + instant signup closes the loop

The copy, progress labels, and transition design are all built to make this 1-2-3 chain self-evident to the prospect.

---

## Technical notes

- Entry point: `/?mode=feedback` (URL parameter)
- The feedback flow and the standard branding flow share the same `OnboardingProvider` context, mockup component, and Get Started dialog
- The analysis pipeline uses Haiku 4.5 for classification (batch size 3) and Sonnet 4.6 for report writing (selector + 5-6 parallel writers)
- Pipeline runs ~35-40 seconds end-to-end
- All branding work (logo, colours, screenshots, chain discovery) runs in parallel with the analysis — by the time the report is ready, branding is already done
- PDF export uses html2canvas + jsPDF to capture the report exactly as rendered
- Cal.com embed is env-configurable (`NEXT_PUBLIC_CALCOM_BOOKING_LINK` + `NEXT_PUBLIC_CALCOM_ORIGIN` for EU regions)
