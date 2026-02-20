/**
 * PackPathCards — T0260: "Pick your path" cards for quick pack selection.
 */

import type { PackOption } from "./DemoSessionHelpers";

interface Props {
  packOptions: PackOption[];
  selectedPackKey: string;
  onSelect: (key: string) => void;
}

interface PathCard {
  matchPrefix: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

const CARDS: PathCard[] = [
  {
    matchPrefix: "demo-10@",
    title: "First Run",
    subtitle: "10 words · ~1 min",
    description: "Quick UI demo — get a feel for the task. Not intended for interpretation.",
    icon: "🎯",
  },
  {
    matchPrefix: "kent-rosanoff-1910@",
    title: "Standard Run",
    subtitle: "100 words · ~10 min",
    description: "The classic Kent–Rosanoff list — a well-established word association set.",
    icon: "📋",
  },
  {
    matchPrefix: "practice-100@",
    title: "Deep Practice",
    subtitle: "100 words · ~10 min",
    description: "A broader set for deeper exploration of personal response patterns.",
    icon: "🔬",
  },
];

export function PackPathCards({ packOptions, selectedPackKey, onSelect }: Props) {
  // Only show cards for packs that exist in the available options
  const availableCards = CARDS.filter((card) =>
    packOptions.some((p) => `${p.id}@${p.version}`.startsWith(card.matchPrefix)),
  );

  if (availableCards.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="pack-path-cards">
      <div className="grid gap-2 sm:grid-cols-3">
        {availableCards.map((card) => {
          const matchingOption = packOptions.find((p) => `${p.id}@${p.version}`.startsWith(card.matchPrefix));
          if (!matchingOption) return null;
          const key = `${matchingOption.id}@${matchingOption.version}`;
          const isSelected = selectedPackKey === key;

          return (
            <button
              key={card.matchPrefix}
              type="button"
              onClick={() => onSelect(key)}
              className={`rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{card.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">{card.subtitle}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">{card.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
