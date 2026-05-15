# Family + Vercel — Aesthetic Continuity Reference

> Lens: how to bridge dark theatrical surfaces (login) to light refined surfaces (platform) without a jarring seam. Family solves the brand-to-app transition; Vercel solves dense-but-calm product UI.

## 1. Aesthetic POV

**Family (family.co)** — A crypto wallet that resolves the genre's usual neon-maximalism into something closer to a perfume site: a dark, atmospheric marketing surface (deep near-black, soft warm radials, emoji-as-jewelry accents) transitioning into a calm, near-monochrome product surface where iOS app screenshots feel like quiet stationery. **The transition is the product** — they earn refinement by *withholding* color, letting one or two animated price charts and personalized QR codes carry all the warmth. Tone: editorial, slightly playful, never crypto-bro.

**Vercel (vercel.com)** — The reference for "dense but calm." Marketing uses dramatic dark hero sections with a single high-contrast headline in Geist, then drops into product screenshots that are aggressively neutral: white/near-black surfaces, monospace runs of log data, tiny status dots doing all the chromatic work. The signature move is restraint — 60+ products in the footer organized without ornament, screenshots floated as rounded rectangles with subtle shadow rather than mockup chrome.

## 2. Typography

- **Family**: a tightened grotesque, ~−0.01em tracking on display, used at very large sizes (clamp ~48–88px) for hero, then dropping to a quiet ~15–16px body. Sentence case throughout. Strong weight contrast: ultra-thin/regular display vs. medium UI labels.
- **Vercel**: **Geist Sans** for everything UI/marketing, **Geist Mono** for logs, timestamps, deploy IDs, status codes. Display ~72–96px / −0.04em tracking; product UI 13–14px. Mono used as *texture* — tables of `217ms`, `200`, `/api/auth` become a visual rhythm, not raw data dumps.

## 3. Color & surfaces

| | Family | Vercel |
|---|---|---|
| Dark surface | Near-black `#0A0A0A`–`#111` with warm radial wash | True black `#000`/`#0A0A0A`, cooler |
| Light surface | Warm off-white `#FAFAF7`-ish | Cool `#FAFAFA` / pure `#FFF` |
| Accent | Withheld — single warm gradient per section, emoji as color | Status dots only: green `#0CCE6B`, amber, red; brand accent kept to single CTA |
| Borders | Hairline `rgba(0,0,0,0.06)` on light, `rgba(255,255,255,0.08)` on dark | Identical strategy — 1px hairlines do the heavy lifting |

**Dark→light handling**: both treat dark as *cinematic* (hero, marketing, launch) and light as *operational* (the actual app). Vercel literally inlines light product screenshots inside dark marketing sections — the screenshot becomes a "window cut into the night." **That's the bridge pattern.**

## 4. Layout patterns

- **Vercel**: 1200–1280px max container, 12-col implied but mostly used as 8-col editorial. Generous `padding-block: 96–160px` between marketing sections. Product UI uses a *left rail + main canvas* with breathing room — tables don't stretch full-bleed; they sit inside cards with `border-radius: 8–12px`. Density is calmed by *consistent row height* (~36px) and right-aligned numerics.
- **Family**: Mostly single-column, centered, phone-mockup-driven. Sections stack as discrete "scenes" with their own background tone — the page itself is a slide deck.

## 5. Motion

- **Family**: signature is the **animated price chart scrub** — value updates as cursor moves, easing ~`cubic-bezier(0.22, 1, 0.36, 1)` ~400ms. Section-to-section cross-fades with slight Y translate (~12px). Emoji micro-animations on hover.
- **Vercel**: restrained. Deploy status dots have a soft pulse (~1.6s loop, 0.6→1 opacity). Marketing screenshots crossfade between states (logs scrolling, comments appearing) on a slow ~3–5s loop — feels alive, never busy.

## 6. Signature details

1. **Hairline-everything** — both refuse heavy shadows; 1px borders + max 1 layer of `box-shadow: 0 1px 2px rgba(0,0,0,0.04)`.
2. **Geist Mono as texture** (Vercel) and **emoji-as-accent** (Family) — a *single non-system element* as the only chromatic flourish.
3. **Status dots over status pills** — Vercel reduces "Ready / Building / Error" to colored circle + mono label, not full badges.
4. **Screenshot-in-dark-section** — Vercel's recurring move: a light product card floats inside a black marketing band with `border-radius: 12px` and a faint inner highlight (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.06)`).
5. **Personalized QR / receive screen** (Family) — one warm artifact carries the entire brand. OIS equivalent: the gradient logomark.

## 7. Specific moments worth lifting for OIS

| Family/Vercel pattern | OIS surface |
|---|---|
| **Family transition: dark recedes upward into accent stripe** | Login → AppShell — on auth success, ~600ms transition where the dark radial recedes upward into the topbar as a 2px gradient stripe (`#1F4FD4 → #0BA5EC`) under the TopBar border. The login's atmospheric glow literally *becomes* the platform's accent line. |
| **Vercel "light screenshot in dark marketing"** | `Login.tsx` — embed a *light* preview card (small dashboard fragment) floating in the dark scene with `border-radius: 12px`, hairline white border, faint inset highlight. Previews what's behind the door; solves continuity by showing both tones at once. |
| Vercel Observability density | `/` Dashboard — Geist Mono timestamps + right-aligned numerics + 36px row height + status **dots** (not pills) for severity. P1 = `#B42318` dot, full chip only when row is selected. |
| Vercel sidebar restraint | `Sidebar.tsx` — 13px labels at `rgba(0,0,0,0.62)`, active = 2px left accent in `#1F4FD4` + `rgba(31,79,212,0.06)` bg — **no full pill**. |
| Family scene-stacking | Any future OIS landing/marketing pages — stack discrete tonal scenes rather than one continuous light page. |
| Vercel Changelog | OIS release notes / audit log — date in `#6B7280` above a 28px bold title, screenshots framed as 12px rounded with hairline border, 96px vertical rhythm. |

## 8. What NOT to steal

- **Family's emoji-as-accent** — brand-specific to consumer crypto warmth; on an ITSM platform it reads as toy-like.
- **Family's warm off-white** (`#FAFAF7`) — clashes with `#1F4FD4` (cool blue). Stick with cool `#F7F8FA`.
- **Family's single-column slide-deck marketing layout** — wrong for a dense ops product.
- **Vercel's pure black `#000`** for login — too cold next to `#1F4FD4`/`#0BA5EC` accents; OIS's near-black with radial warmth is better.
- **Vercel's "60 products in footer"** information dump — OIS doesn't have that surface area.
- **Crypto-flavored copy patterns** ("Your crypto, your control") — skip. The *cadence* of short reassuring lines is transferable, the vocabulary isn't.
- **Heavy mockup chrome / device frames** — both products avoid them; OIS should too.

---

## The single most important takeaway

Dark→light continuity isn't solved by easing curves — it's solved by **carrying one element across the threshold**. For Vercel that's Geist Mono + status dots. For Family it's the warm radial. **For OIS, make it the `#1F4FD4 → #0BA5EC` gradient**: the login's atmospheric centerpiece becomes the platform's accent stripe under the TopBar and the active-state indicator in the Sidebar. Same pigment, demoted from theatrical to operational.
