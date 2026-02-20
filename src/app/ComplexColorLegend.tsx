/**
 * ComplexColorLegend — T0262: Color map for candidate complex labels.
 * Provides predefined colors and a legend display.
 */

const COMPLEX_COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(35, 80%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(350, 65%, 55%)",
  "hsl(180, 50%, 45%)",
  "hsl(45, 75%, 50%)",
] as const;

export function getComplexColor(colorMap: Record<string, number>, label: string): string {
  const idx = colorMap[label] ?? 0;
  return COMPLEX_COLORS[idx % COMPLEX_COLORS.length];
}

export function nextColorIndex(current: number): number {
  return (current + 1) % COMPLEX_COLORS.length;
}

export function getComplexColorForTrial(
  colorMap: Record<string, number>,
  complexLabels: string[] | undefined,
): { color: string; label: string; extra: number } | null {
  if (!complexLabels || complexLabels.length === 0) return null;
  const first = complexLabels[0];
  return {
    color: getComplexColor(colorMap, first),
    label: first,
    extra: complexLabels.length - 1,
  };
}

export { COMPLEX_COLORS };
