# Design System Strategy: The Midnight Lab Aesthetic
 
## 1. Overview & Creative North Star
**Creative North Star: "The Luminescent Observatory"**
 
This design system moves away from the "data-heavy spreadsheet" archetype of SaaS and instead positions itself as a premium, editorial experience. We treat health and nutritional data not as static numbers, but as living insights. By utilizing a "Midnight" foundation, we allow the vibrant Emerald and Cyan accents to act as bioluminescent guides through the interface.
 
To break the "template" look, this system rejects rigid, boxed-in grids. We utilize **intentional asymmetry**, where large Display typography overlaps soft glass containers, and **tonal depth** replaces structural lines. The result is an interface that feels like a high-end physical dashboard—expensive, precise, and breathing with spaciousness.
 
---
 
## 2. Colors: Tonal Depth & The "No-Line" Rule
 
The color palette is anchored in `#0a0e14` (Midnight), creating a canvas where light and color are used surgically to direct attention.
 
### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to section off the UI. 
*   **Definition:** Boundaries must be defined solely through background color shifts. Use `surface-container-low` for secondary sections sitting on a `surface` background.
*   **The Signature Shift:** Instead of a border, use a 24px vertical gap or a subtle change from `surface-container` to `surface-container-high` to denote a new functional area.
 
### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers of smoked glass.
*   **Base:** `surface` (#0a0e14)
*   **Sectioning:** `surface-container-low` (#0f141a)
*   **Interactive Cards:** `surface-container` (#151a21)
*   **Active/Pop-over:** `surface-container-highest` (#20262f)
 
### The "Glass & Gradient" Rule
To achieve the "Aura" aesthetic, use Glassmorphism for floating elements (like the navigation bar).
*   **Token:** `surface-variant` at 60% opacity with a `20px` backdrop-blur.
*   **Gradients:** Use a linear gradient from `primary` (#3fff8b) to `primary-container` (#13ea79) for high-value CTAs. This creates a "glow" effect that flat colors cannot replicate.
 
---
 
## 3. Typography: Editorial Authority
 
We use a high-contrast pairing of **Space Grotesk** (Geometric/Technical) and **Manrope** (Functional/Modern).
 
*   **Display (Space Grotesk):** Used for "Big Moments"—daily calorie totals, health scores, or hero headers. The oversized nature of `display-lg` (3.5rem) creates an editorial, high-fashion feel.
*   **Headlines (Space Grotesk):** Sharp and authoritative. Use `headline-md` for dashboard card titles to provide a technical, "scanned" look.
*   **Body & Titles (Manrope):** Chosen for its superior legibility in dense data environments. Use `body-md` for all descriptive text to maintain a sophisticated "quietness" against the loud headers.
*   **Labels (Space Grotesk):** Small caps or uppercase `label-md` should be used for data metadata (e.g., "PROTEIN", "VITAMIN C") to maintain the technical lab aesthetic.
 
---
 
## 4. Elevation & Depth: Tonal Layering
 
Traditional shadows are often "muddy." In this system, depth is achieved through light and transparency.
 
*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This "negative depth" creates a recessed look that feels more integrated than a standard drop shadow.
*   **Ambient Shadows:** For floating elements, use a "Cyan-Tinted Shadow": 
    *   `box-shadow: 0 20px 40px -10px rgba(0, 227, 253, 0.08);`
    *   This mimics the light from the Cyan accents bouncing off the midnight surface.
*   **The Ghost Border:** If accessibility requires a stroke, use `outline-variant` (#44484f) at **15% opacity**. It should be felt, not seen.
*   **Corner Radius:** Strict adherence to the `xl` (24px) token for main dashboard cards and `lg` (16px) for nested elements. This extreme roundness softens the "tech" edge and makes the brand feel approachable.
 
---
 
## 5. Components: Style & Execution
 
### Floating Navigation
*   **Styling:** Semi-transparent `surface-container-high` (80% opacity) with a `16px` blur.
*   **Shape:** `full` (pill-shaped) or `xl` (24px rounded).
*   **Placement:** Detached from the top of the screen by 24px to emphasize the "floating" nature.
 
### Interactive Dashboard Cards
*   **Surface:** `surface-container`.
*   **Hover State:** Transition to `surface-container-highest` with a `primary` (#3fff8b) "glow" top-border (2px).
*   **Content:** No dividers. Use `title-md` for metrics and `body-sm` for labels, separated by `spacing-lg`.
 
### Primary Buttons
*   **Fill:** Linear gradient (135deg, `primary`, `secondary`).
*   **Text:** `on-primary` (#005d2c), Bold.
*   **Corner:** `full` (9999px) for a sleek, modern look.
 
### Input Fields
*   **Background:** `surface-container-lowest`.
*   **Focus:** 1px "Ghost Border" using `secondary` (#00e3fd) at 40% opacity. No solid fills.
*   **Typography:** `body-md`.
 
---
 
## 6. Do’s and Don'ts
 
### Do:
*   **Do** use extreme white space. If you think there’s enough padding, add 8px more.
*   **Do** overlap elements. Let a glass card partially obscure a background glow or a large Display-scale number.
*   **Do** use "Cyan" (#00e3fd) for interactive data points and "Emerald" (#3fff8b) for success or completion states.
 
### Don't:
*   **Don't** use 100% white text. Use `on-surface-variant` (#a8abb3) for secondary text to reduce eye strain against the midnight background.
*   **Don't** use dividers or lines. Separate content with 32px or 48px of empty space.
*   **Don't** use standard "Grey" shadows. If a shadow is needed, it must be tinted with the `secondary` or `background` hue.
*   **Don't** use sharp corners. Everything must feel organic and "honed" using the 16-24px radius scale.