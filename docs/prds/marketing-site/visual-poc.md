# PRD — Scholar Premium Marketing Site Visual POC

> Status: **draft**
> Relation to School Lab: post-MVP marketing initiative and implementation experiment
> Public brand: **Scholar Premium**
> Surface: `site/` at `/`
> Primary locale: `pt-BR`
> Requirement provenance: `[product decision]`

## Context and motivation

The current `site/` surface is a static "Em breve" placeholder. It establishes the public
Scholar Premium brand and links to `/app`, but it does not yet explain the product's value,
differentiate it from generic school-management software, or provide a credible commercial
journey.

The product vision is grounded in recurring operational pain at Brazilian private schools:
unreliable systems, manual billing, fragmented family communication, and physical archives.
The marketing site must turn that product truth into an expressive, premium experience without
claiming that roadmap capabilities are already available.

This POC validates one art direction before the full sales site is specified or shipped.

## Objective

Validate that the **Legacy in Motion** concept can make Scholar Premium feel distinctive,
credible, and technically excellent while preserving semantic content, accessibility, and
performance on real devices.

The POC succeeds when a reviewer can understand the brand thesis, navigate the complete first
screen without WebGL, and identify the graduation-cap scene as part of the product narrative
rather than decorative technology.

### POC scope

This experiment implements **Frame 01 only** as an interactive hero. Frames 02–06 are storyboard
requirements for the future production site, not implementation scope for this POC. The POC also
produces desktop, mobile, reduced-motion, and WebGL-fallback captures of Frame 01.

## Target audience

Primary:

- Owners and directors of Brazilian private basic-education schools.
- School administrators evaluating replacement of an unreliable or fragmented system.

Secondary:

- Secretaries and coordinators who influence adoption.
- Teachers and Responsáveis who need confidence in the platform's daily operation.
- Partner organizations and private-school associations.

The marketing site is public. Backoffice operators and students are not target actors for this
POC.

## Experience thesis

### Concept

**Legacy in Motion** (`Legado em movimento`)

The graduation cap represents the outcome and long-term responsibility of a school. A restrained
gold line originates in the 3D object and becomes the visual spine connecting academic,
financial, document, and family-relationship chapters.

### Hero message

> **Toda escola constrói um legado.**
> **A gestão precisa estar à altura dele.**

Supporting copy:

> Uma plataforma para reunir a operação acadêmica, financeira, documental e a relação com as
> famílias — pensada para escolas particulares brasileiras.

Primary CTA: `Agendar demonstração`

Secondary CTA: `Acessar plataforma`

For Frame 01 only, the primary CTA uses a provisional `mailto:` destination so its interaction can
be tested without adding an API or lead processor. This does not decide the production conversion
flow, provider, consent behavior, retention, or submission processing.

### Narrative principle

The site sells trust before it lists features. Product screenshots appear as evidence after the
problem and positioning are established.

## Bar

**Reference:** [Cartier Watches & Wonders](https://www.awwwards.com/watches-wonders-immersive-experience-for-cartier.html)
editorial 3D chapters plus the Shopify Editions scroll sequence and Hubtown single-object B2B
hero documented in [Best Three.js Websites 2026](https://www.utsubo.com/blog/best-threejs-websites-2026)

**Rationale:** The combined reference tests whether one purposeful 3D object can carry a clear
editorial product narrative without becoming a technology demo.

**Recognizably bad:** yes — the rejection signals below identify generic AI/SaaS composition,
meaningless motion, fabricated evidence, and inaccessible WebGL dependence.

The external interaction bar is:

- Cartier Watches & Wonders: scene changes behave as editorial chapters, not a technology demo.
- Shopify Editions: scroll advances a clear product narrative.
- Hubtown: one 3D object gives weight to a B2B brand.

These references define interaction quality only. Scholar Premium must not reproduce their
visual identity.

### Review rubric

Five independent reviewers cover visual direction, accessibility, performance, copy/claims, and
resilience. Approval requires:

- no automatic rejection signal;
- no critical finding from any reviewer;
- evidence produced independently by each reviewer;
- visual scores of at least 4/5 for hierarchy, originality, brand fidelity, 3D narrative meaning,
  and responsive composition;
- every applicable acceptance criterion passing or being reported as a blocking gap.

### Required qualities

- Editorial hierarchy remains clear in a still screenshot.
- The 3D object has material weight, controlled lighting, and purposeful camera movement.
- Motion reveals meaning; it does not delay access to content.
- Navy and gold come from the Scholar Premium identity; purple remains a product-UI accent only.
- The page combines dark institutional scenes with warm paper-like sections.
- Real interface captures are treated as product evidence, not floating decoration.

### Automatic rejection signals

Reject the direction if any first-screen composition depends on:

- neon purple or blue glow as the primary identity;
- glassmorphism, bento grids, floating dashboard cards, or gradient blobs;
- particle fields with no narrative role;
- an endlessly rotating 3D object;
- generic claims such as "transforme sua escola" without product evidence;
- illegible generated text, invented metrics, or fabricated customer testimonials;
- text rendered only inside WebGL.

## Visual system

### Color

- Midnight navy: primary stage and navigation.
- Deep ink blue: dimensional background variation.
- Warm ivory: editorial sections and readable contrast.
- Scholar gold: narrative line, focus accents, and controlled highlights.
- Product purple: permitted only inside authentic product screenshots or minor functional UI.

Exact production values must be reconciled with `packages/design-tokens/colors.json` and the
approved brand assets before implementation.

### Typography

- Editorial serif for manifesto-scale statements.
- Inter for navigation, body copy, captions, controls, and product evidence.
- No condensed display face or novelty type in the POC.
- Text remains live HTML at every viewport.

### Imagery

- Use the approved Scholar Premium lockup and mark.
- Use the supplied graduation-cap GLB as the canonical hero object.
- Use authentic Scholar Premium product captures; generated dashboard screens are prohibited.
- AI-generated imagery may be used only as non-authoritative art-direction exploration.

## Content and claim boundaries

The POC may communicate the product vision:

- one platform for academic, financial, document, and family-relationship management;
- designed for Brazilian private schools;
- privacy by default and per-school data isolation as design principles;
- billing automation and existing web product capabilities, qualified where needed.

The POC must not present the following as generally available:

- complete two-way communication or a complete mobile app;
- complete audit-ready digital archive;
- Livro Ata, legally validated digital signatures, or semantic search;
- a student portal;
- automated WhatsApp/email dunning;
- NFS-e;
- "100% LGPD", guaranteed stability, or zero data loss;
- customer counts, outcome percentages, or testimonials without verified evidence.

Roadmap capabilities may appear only when explicitly labelled `Em desenvolvimento` or
`Próximas etapas`.

### Claim substantiation

- **Implemented evidence:** authenticated product access and exact workflows visible in
  privacy-safe captures may be described factually. The billing partner baseline may be described
  as existing only when the surrounding copy does not imply complete platform-wide rollout.
- **Documented vision or partial implementation:** academic, communication, and archive pillars
  may describe the platform direction using phrases such as `uma plataforma para reunir`; they
  must not use availability CTAs or completion language.
- **Post-MVP roadmap:** Livro Ata, digital signatures, semantic search, student portal, NFS-e, and
  automated dunning may appear only in a clearly separated roadmap context.
- **Unsubstantiated:** customer counts, performance outcomes, legal guarantees, certifications,
  testimonials, and comparative superiority remain prohibited until evidence and marketing
  approval are linked from this PRD.

Every product-proof caption must link internally to its implementation evidence or owning PRD
before production publication.

## Storyboard

### Frame 01 — Arrival / legacy

Viewport: desktop first screen and mobile equivalent.

- The Scholar Premium navigation is present immediately.
- The headline and both CTAs render before the 3D scene.
- A navy graduation cap emerges from near-black through a narrow warm-gold side light.
- Pointer movement affects light and camera parallax by a small bounded amount.
- The object never performs a free-running full rotation.
- The gold line is introduced as a seam or tassel detail.

### Frame 02 — The trust gap

Copy:

> **O problema não é falta de software.**
> **É falta de confiança.**

- The scene transitions from midnight navy to warm ivory.
- The cap moves partially outside the viewport; the gold line remains and guides reading.
- Short editorial statements introduce system instability, manual operations, fragmented
  communication, and physical archives.
- No unverified market statistic is displayed.

### Frame 03 — One connected school

- Four chapters appear sequentially: `Acadêmico`, `Financeiro`, `Documentos`, `Famílias`.
- The gold line changes function in each chapter: academic rule, payment timeline, archive spine,
  and communication path.
- Chapters use typography and spatial transitions rather than a bento-card grid.
- Copy distinguishes available product evidence from vision or roadmap.

### Frame 04 — Product proof

Copy:

> **Não é uma promessa abstrata. É uma plataforma em construção real.**

- Authentic product captures are shown at readable scale.
- Each capture has one factual caption describing the demonstrated workflow.
- Decorative device mockups do not obscure the interface.
- Sensitive, personal, or partner-school data is removed from captures.

### Frame 05 — Trust and privacy

- A restrained dark section explains per-school isolation, privacy by default, and care with
  children's data.
- No certification badge is shown unless the certification exists and is approved for marketing.
- Accessibility and reduced-motion behavior remain equivalent to earlier sections.

### Frame 06 — Closing loop

Copy:

> **Sua escola já constrói o futuro todos os dias.**
> **A gestão pode acompanhar.**

- The gold line reconnects visually with the graduation cap or brand mark.
- Primary conversion CTA is visible.
- Footer exposes Scholar Premium only; internal naming never appears.

## POC technical approach

The POC is isolated from the current production placeholder until approved.

Recommended implementation:

- Vite + TypeScript for a minimal static build.
- Three.js for the graduation-cap scene.
- Native CSS and requestAnimationFrame for Frame 01 motion.
- GSAP + ScrollTrigger are reserved for future storyboard chapters unless profiling proves that
  Frame 01 requires them.
- Lenis is excluded from Frame 01 and may be evaluated for the full site only if native keyboard,
  touch, anchor, and reduced-motion behavior remain intact.
- Semantic HTML and CSS for all content and controls.
- A static poster for WebGL failure, low-power mode, and reduced motion.

The marketing surface must not consume `/api/v1`.

### 3D asset profile

The externally supplied source asset
`/Users/diegonovais/work/dla_solutions/school_lab_brand/6An0RSBiJO.glb` is approximately 2.1 MB
with:

- one scene, node, mesh, primitive, material, texture, and embedded image;
- 18,206 vertices;
- approximately 27,928 triangles;
- no animation, skin, or glTF extension dependency.

The geometry is acceptable for the POC. Production work should test texture resizing and
Meshopt/Draco/KTX2 options against visible quality before setting a final transfer budget.
The interactive POC must import a repository-local copy with a descriptive filename; the
machine-local source path is discovery provenance, not a deployable dependency.

## Non-functional requirements

### Accessibility

- WCAG 2.1 AA is the baseline.
- Canvas is technically decorative, `aria-hidden`, non-focusable, and does not intercept pointer
  events. Its narrative concepts are repeated in live headings and copy; no information exists
  only in camera, light, material, or motion changes.
- Complete content and conversion remain available without JavaScript or WebGL.
- `prefers-reduced-motion: reduce` replaces continuous and scroll-linked motion with stable states.
- Focus order, visible focus, keyboard activation, and skip navigation are required.
- Copy contrast is measured against its final rendered background.

### Performance

POC targets under a controlled mobile profile:

- LCP at or below 2.5 seconds.
- CLS at or below 0.1.
- INP at or below 200 ms.
- Mobile animation frame-time p95 at or below 33.3 ms during a 10-second interaction sample.
- Desktop animation frame-time p95 at or below 20 ms during the same sample.
- Renderer pixel ratio capped and animation paused when the document is hidden.

The initial lab profile is current stable Chrome at 390 × 844 CSS pixels, DPR 2, Fast 4G network
emulation, and 4× CPU slowdown. Desktop evidence uses current stable Chrome and Safari at
1440 × 900. Physical-device frame-rate approval remains blocked until the representative Android
device is selected in Open items.

Metrics must be reported with device, browser, network, and build details. A target is not an
approval without measured evidence.

### Resilience

- WebGL initialization failure shows the poster without losing content.
- Model or texture failure does not block navigation or CTA interaction.
- The page remains readable at 320 CSS pixels wide and at 200% zoom.

## Acceptance criteria

1. Given any visible marketing-site state, when the page, metadata, manifest, accessibility tree, and fallback content are inspected, then `Scholar Premium` is the public brand and `School Lab`, `SchoolLab`, and `school_lab` are absent from customer-facing output. **AC-001 — Public brand boundary `[product decision]`.**
2. Given a cold page load with JavaScript enabled, when the browser renders the first screen, then the public lockup, headline, supporting copy, and CTAs appear without waiting for the GLB. **AC-002 — First meaningful render `[product decision]`.**
3. Given WebGL is unavailable or initialization fails, when the page loads, then a stable poster replaces the canvas and all content, navigation, and CTAs remain usable. **AC-003 — WebGL independence `[product decision]`.**
4. Given the user enters and explores interactive Frame 01, when the graduation-cap scene changes, then every camera, light, or object transition corresponds to the Arrival / legacy storyboard beat and the object never performs an unbounded idle rotation. **AC-004 — Purposeful 3D choreography `[product decision]`.**
5. Given `prefers-reduced-motion: reduce`, when the page loads and the user interacts, then continuous animation and pointer-linked transitions are disabled and an equivalent static composition preserves the Frame 01 narrative. **AC-005 — Reduced motion `[product decision]`.**
6. Given a keyboard-only user, when they navigate the page, then a skip link, navigation, and CTAs are reachable in logical order and each focused element has a visible focus indicator. **AC-006 — Keyboard and focus `[product decision]`.**
7. Given viewports at 320, 390, 768, 1440, and 1920 CSS pixels, when Frame 01 is reviewed, then text remains readable without horizontal scrolling and the 3D composition is intentionally reframed rather than merely scaled down. **AC-007 — Responsive art direction `[product decision]`.**
8. Given a product screenshot or feature caption in any later production-site frame, when its source and product maturity are checked, then the screenshot is authentic and privacy-safe and the caption does not represent a roadmap capability as available. **AC-008 — Honest product evidence `[product decision]`.**
9. Given the desktop and mobile Frame 01 captures, when reviewed against the rejection signals in `Bar`, then none of the listed slop patterns is necessary to communicate hierarchy or brand. **AC-009 — No generic SaaS composition `[product decision]`.**
10. Given a production POC build and the documented test profile, when Lighthouse and runtime frame measurements are executed, then LCP, CLS, INP, and frame-rate results are attached to the review and any missed target is reported as a gap rather than waived silently. **AC-010 — Performance evidence `[product decision]`.**
11. Given the rendered POC document, when HTML and metadata are inspected, then it has one descriptive `h1`, a logical heading outline, pt-BR metadata, canonical URL support, social sharing metadata, and crawlable copy. **AC-011 — Semantic and SEO baseline `[product decision]`.**
12. Given the complete Frame 01 POC journey, when network requests are inspected, then no request to `/api/v1` is needed to render or navigate the page. **AC-012 — No API dependency `[product decision]`.**
13. Given analytics is later enabled, when the POC is promoted toward production, then no analytics SDK ships until provider, consent, retention, and event-minimization decisions are documented. **AC-013 — Privacy-safe analytics `[product decision]`.**
14. Given the interactive Frame 01 candidate, when reviewed in current Chrome, Safari, and Firefox plus iOS Safari and Android Chrome, then critical content and CTAs work in every browser and browser-specific visual gaps are recorded with screenshots. **AC-014 — Real-browser review `[product decision]`.**
15. Given the implementation claims completion, when separate visual, accessibility, performance, copy/claims, and resilience reviewers test it, then each reviewer provides evidence for their own verdict and unresolved critical gaps block approval. **AC-015 — Independent quality gate `[product decision]`.**

## Initial POC frames

The first visual exploration covers Frame 01 in two desktop variants. These generated frames are
art-direction references only: production typography, logo, copy, and the graduation cap must be
rendered from repository assets and live HTML/Three.js.

### Variant A — horizontal editorial statement

![Legacy in Motion hero variant A](../../assets/marketing-site/legacy-in-motion-hero-a.png)

### Variant B — stronger typographic scale

![Legacy in Motion hero variant B](../../assets/marketing-site/legacy-in-motion-hero-b.png)

Both frames intentionally remain non-authoritative. Their generated crests, cap details, spacing,
and typefaces must not be copied as brand assets. Variant B was selected as the stronger hierarchy
and negative-space model for the interactive POC; implementation must still use approved brand
assets, live HTML, and the canonical GLB.

## Open items

- [x] Use Variant B as the Frame 01 composition reference.
- [ ] Decide the production conversion: demo request, waitlist, direct contact, or product access.
- [ ] Approve exact public claims for implemented versus roadmap capabilities.
- [ ] Decide whether the full site needs a lead form and where submissions are processed.
- [ ] Decide analytics provider, consent behavior, retention, and event taxonomy.
- [ ] Approve the production serif typeface and its webfont license.
- [ ] Obtain privacy-safe high-resolution product captures.
- [ ] Select representative mobile and desktop devices for the performance bar.
- [x] Copy the source GLB into a repository-owned asset path before implementation.

## Out of scope

- Shipping the full production marketing site.
- Publishing pricing, customer counts, testimonials, or partner logos.
- Building CMS, blog, help center, or authenticated product features.
- Changing API, SPA, backoffice, or mobile business behavior.
- Rebranding internal School Lab identifiers.
- Creating new product capabilities to satisfy marketing copy.

## Deliverables for this experiment

- This visual POC PRD and storyboard.
- Two high-fidelity Frame 01 art-direction variants.
- One isolated interactive hero using the canonical GLB after a frame is selected.
- Desktop, mobile, reduced-motion, and WebGL-fallback captures.
- Measured accessibility, performance, copy, and resilience review evidence.
