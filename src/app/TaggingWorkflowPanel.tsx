/**
 * TaggingWorkflowPanel — T0261: Guided "Tag & Group" workflow.
 * 3-step checklist that guides users through annotating flagged trials.
 */

interface Props {
  flaggedCount: number;
  annotatedCount: number;
  complexLabelCount: number;
  onTagNow: () => void;
  onDoneTagging: () => void;
}

export function TaggingWorkflowPanel({
  flaggedCount, annotatedCount, complexLabelCount,
  onTagNow, onDoneTagging,
}: Props) {
  const step1Done = flaggedCount > 0;
  const step2Done = annotatedCount > 0;
  const step3Done = complexLabelCount > 0;

  return (
    <div className="rounded-md border border-border bg-muted/10 p-4 space-y-3" data-testid="tagging-workflow-panel">
      <details open>
        <summary className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary">
          Tag &amp; Group (recommended)
        </summary>

        <div className="mt-3 space-y-2">
          <ol className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border text-center text-[10px] leading-4 font-bold ${
                step1Done ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}>
                {step1Done ? "✓" : "1"}
              </span>
              <span className="text-foreground">
                Review flagged items
                <span className="ml-1 text-muted-foreground">({flaggedCount} flagged)</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border text-center text-[10px] leading-4 font-bold ${
                step2Done ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}>
                {step2Done ? "✓" : "2"}
              </span>
              <span className="text-foreground">
                Tag emotions / candidate complexes / association types
                <span className="ml-1 text-muted-foreground">({annotatedCount} tagged)</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border text-center text-[10px] leading-4 font-bold ${
                step3Done ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
              }`}>
                {step3Done ? "✓" : "3"}
              </span>
              <span className="text-foreground">
                Review grouped workbook
                <span className="ml-1 text-muted-foreground">({complexLabelCount} labels)</span>
              </span>
            </li>
          </ol>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onTagNow}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              data-testid="tag-now-btn"
            >
              Tag now
            </button>
            <button
              type="button"
              onClick={onDoneTagging}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              data-testid="done-tagging-btn"
            >
              Done tagging
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
