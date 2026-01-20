# UI UX Pro Max

An AI SKILL that provides design intelligence for building professional UI/UX across multiple platforms. This skill incorporates 100+ industry-specific reasoning rules to generate complete design systems and provide stack-specific implementation guidelines.

## Quick Reference

- **Accessibility**: 4.5:1 contrast ratio, 44x44px touch targets.
- **Typography**: 1.5-1.75 line-height for body text.
- **Icons**: Use SVG icons (Heroicons, Lucide) instead of emojis.
- **Interactions**: Add `cursor-pointer` to clickable elements, use smooth transitions (150-300ms).

## Core Capabilities

1. **Design System Generation**: Automatically generate colors, typography, and styles based on product type and industry.
2. **UX Best Practices**: Recommendations for layout, spacing, and interaction patterns.
3. **Stack-Specific Guidelines**: Implementation details for Next.js, React, Tailwind CSS, and more.
4. **Anti-Pattern Detection**: Identify and avoid common UI/UX pitfalls.

## Usage

Invoke the skill when performing any UI/UX related task.

```bash
# Generate a design system
python3 .shared/ui-ux-pro-max/scripts/search.py "fintech banking dark" --design-system
```

Refer to [.agent/workflows/ui-ux-pro-max.md](file:///Users/home/Documents/Info Site/mubasher-deep-extract/.agent/workflows/ui-ux-pro-max.md) for full workflow details.
