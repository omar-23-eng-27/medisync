---
name: MediSync Clinical Excellence
colors:
  surface: '#fbf8ff'
  surface-dim: '#d6d8f4'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ececff'
  surface-container-high: '#e5e6ff'
  surface-container-highest: '#dee1fd'
  on-surface: '#161a2e'
  on-surface-variant: '#4e4351'
  inverse-surface: '#2b2f44'
  inverse-on-surface: '#f0efff'
  outline: '#807382'
  outline-variant: '#d1c2d3'
  surface-tint: '#8b35b3'
  primary: '#5e0084'
  on-primary: '#ffffff'
  primary-container: '#7a22a3'
  on-primary-container: '#e7acff'
  inverse-primary: '#e9b3ff'
  secondary: '#5b5d74'
  on-secondary: '#ffffff'
  secondary-container: '#e0e0fc'
  on-secondary-container: '#61637a'
  tertiary: '#6f0e3e'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d2955'
  on-tertiary-container: '#ffa9c6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f7d8ff'
  primary-fixed-dim: '#e9b3ff'
  on-primary-fixed: '#310048'
  on-primary-fixed-variant: '#701499'
  secondary-fixed: '#e0e0fc'
  secondary-fixed-dim: '#c3c4df'
  on-secondary-fixed: '#181a2e'
  on-secondary-fixed-variant: '#43455b'
  tertiary-fixed: '#ffd9e3'
  tertiary-fixed-dim: '#ffb0ca'
  on-tertiary-fixed: '#3e001f'
  on-tertiary-fixed-variant: '#821f4c'
  background: '#fbf8ff'
  on-background: '#161a2e'
  surface-variant: '#dee1fd'
  surface-muted: '#F3EBFF'
  bg-alternate: '#FAF8FC'
  border-light: '#EEEEEE'
  border-secondary: '#DEDFF0'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  container-max: 1280px
  section-padding-sm: 80px
  section-padding-lg: 120px
---

## Brand & Style

MediSync is a high-fidelity healthcare workforce platform that balances clinical authority with modern employee engagement. The brand personality is **Professional, Data-Driven, and Energetic**, targeting healthcare administrators who need reliability and frontline workers who respond to gamification.

The visual style is **Corporate Modern with Glassmorphic Accents**. It utilizes a clean, systematic layout inherited from SaaS best practices, but softens the enterprise feel with vibrant purple-to-pink gradients, frosted glass cards, and subtle entrance animations. The emotional response should be one of "trustworthy innovation"—it looks like a tool that is both serious about HIPAA compliance and serious about making work rewarding.

## Colors

The palette is centered around **MediSync Purple** (#7a22a3), which serves as the primary driver for identity, actionable items, and success states. 

- **Primary & Containers:** The primary color is used for key brand moments, while `primary-container` (#7a22a3) is frequently used for high-impact buttons and CTA sections.
- **Surface Strategy:** The system uses a multi-tiered surface approach. `background` is a crisp off-white, while `bg-alternate` provides subtle section differentiation. `surface-muted` (a very soft lavender) is used for decorative badges and icon backgrounds to maintain brand presence without the weight of full saturation.
- **Accents:** A tertiary pinkish-red (#ca5986) provides warmth and is used primarily in gradients and high-value statistics to create visual interest.

## Typography

The system uses a pairing of **Hanken Grotesk** for structural authority (headlines) and **Inter** for functional clarity (body/labels).

- **Headlines:** Use Hanken Grotesk with tight letter-spacing on larger sizes to create a modern, premium feel. Bold weights are reserved for Display and Large roles, while Medium roles use Semi-Bold.
- **Body & Labels:** Inter provides maximum legibility for data-heavy sections. Labels use an increased letter-spacing (0.02em) and uppercase styling when used for sub-headers or overlines.
- **Mobile Scaling:** Large headlines scale down significantly (e.g., 48px to 36px) to ensure readability without excessive wrapping on small viewports.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop, centered within a `1280px` container. 

- **Vertical Rhythm:** A strict 8px base unit drives all spacing. Sections are generously padded (80px to 120px) to maintain an airy, premium feel and focus attention on specific value propositions.
- **Responsive Behavior:** On mobile, margins shrink to 16px. The grid reflows from a multi-column (2 or 3) layout to a single-stack layout. 
- **Bento Logic:** Feature sections use a 24px gutter (3 units) to create clear separation between cards while maintaining a tight visual connection.

## Elevation & Depth

MediSync uses a tiered depth system that favors **Glassmorphism** and **Soft Tonal Layers** over heavy shadows.

- **Level 0 (Base):** Flat surfaces with subtle 1px borders (`#EEEEEE`) for standard content cards.
- **Level 1 (Interactive):** Elements that gain a `shadow-sm` or `shadow-lg` on hover, suggesting clickability.
- **Level 2 (Glass):** Specialized cards (e.g., `glass-card`) use a semi-transparent white background (`rgba(255, 255, 255, 0.7)`) with a `10px` backdrop-blur and a light blue-tinted border (`#DEDFF0`).
- **Depth Accents:** Large images or primary CTA sections use `shadow-2xl` combined with "glow" effects—blurry, low-opacity primary-colored blobs positioned behind elements to create a sense of light-emitting importance.

## Shapes

The shape language is **distinctly rounded** to feel approachable and modern.

- **Standard Cards:** Use a 12px (rounded-xl) corner radius.
- **Interactive Elements:** Buttons and Input fields use an 8px radius for a slightly more precise, functional appearance.
- **High-Impact containers:** Large footer or hero containers use a very aggressive 40px radius to create a "superapp" or mobile-inspired aesthetic.
- **Badges:** Decorative badges and chips are always fully rounded (pill-shaped).

## Components

- **Buttons:** Primary buttons are high-contrast purple with white text, using an 8px radius and a height of 56px for main CTAs. Ghost buttons use `on-surface-variant` text with primary-color hover states.
- **Input Fields:** Use a 1px border (`#EEEEEE`) with an 8px radius. Focus states should trigger a primary-colored ring with 10% opacity for a soft halo effect.
- **Cards:** Standard containers use white backgrounds with a subtle border. Feature "Bento" cards include a `surface-muted` badge at the top left to categorize the feature.
- **Chips/Badges:** Small, uppercase labels in `label-md` weight. Use `surface-muted` background with `primary` text for "Impact" stats or "New" tags.
- **Stats:** High-impact numbers are displayed in Hanken Grotesk at 64px, utilizing the primary color to draw the eye immediately to quantifiable success.
- **FAQ Accordions:** Clean, border-separated rows with `expand_more` icons that rotate 180 degrees on toggle.