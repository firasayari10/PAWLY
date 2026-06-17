// ============================================================
// PAWLY — Central icon module (lucide-react)
// Single source of truth for the animal-type icons and the brand mark, so the
// mapping is not duplicated across pages. All icons inherit `currentColor` and
// are sized with Tailwind classes.
// ============================================================

import { createElement } from "react";
import {
  Dog,
  Cat,
  Rabbit,
  Bird,
  Rat,
  Turtle,
  PawPrint,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ANIMAL_ICONS: Record<string, LucideIcon> = {
  chien: Dog,
  chat: Cat,
  lapin: Rabbit,
  oiseau: Bird,
  rongeur: Rat,
  reptile: Turtle,
};

/** The lucide icon for an animal type; falls back to a paw print. */
export function animalIconFor(type?: string | null): LucideIcon {
  return (type && ANIMAL_ICONS[type]) || PawPrint;
}

/** Inline icon for an animal type. Size/color via className. */
export function AnimalIcon({
  type,
  className = "h-4 w-4",
}: {
  type?: string | null;
  className?: string;
}) {
  // createElement keeps the compiler happy: the icon is a static module-level
  // component looked up by key, not a component created during render.
  return createElement(animalIconFor(type), {
    className: `inline-block shrink-0 ${className}`,
    "aria-hidden": true,
  });
}

/**
 * Brand mark: the PAWLY paw print with an AI sparkle accent.
 * The paw keeps the teal brand colour (driven by `className`); a small amber
 * sparkle sits at the top-right to signal the AI assistant. The wrapper inherits
 * the same sizing classes so every existing call site is unaffected.
 */
export function BrandPaw({
  className = "h-5 w-5 text-teal-600 dark:text-teal-400",
}: {
  className?: string;
}) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} aria-hidden>
      <PawPrint className="h-full w-full" />
      <Sparkles
        className="absolute -right-1 -top-1 h-1/2 w-1/2 text-amber-400 drop-shadow-sm dark:text-amber-300"
        strokeWidth={2.5}
      />
    </span>
  );
}

/**
 * Standalone AI sparkle, reused by the assistant launcher button for visual
 * consistency with the brand mark. Colour/size via `className`.
 */
export function AssistantSparkle({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return <Sparkles className={`inline-block shrink-0 ${className}`} aria-hidden />;
}
