import { Link } from "react-router-dom";
import { SessionsDrawer } from "@/app/SessionsDrawer";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { JungMotif } from "@/components/brand/JungMotif";

const Index = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 overflow-hidden">
      {/* Jung motif watermark — home only, behind everything. T0236: size↓, opacity via CSS var */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <JungMotif size={520} />
      </div>

      {/* Sessions button top-right */}
      <div className="absolute right-5 top-5 z-10">
        <SessionsDrawer />
      </div>

      {/* Hero lockup — T0234: BrandLogo owns its own width, no overflow clip */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <BrandLogo height={52} />
        <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase font-medium mt-1">
          Word association analysis
        </p>
      </div>

      {/* Olive divider */}
      <div className="relative z-10 h-px w-32 bg-border/50" />

      {/* T0237: CTA row — tighter, more deliberate spacing, secondary reads clearly clickable */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3">
        <Link
          to="/demo"
          className="rounded-md bg-primary px-7 py-2.5 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Start Demo
        </Link>
        <Link
          to="/sessions"
          className="rounded-md border border-border bg-card px-7 py-2.5 text-base font-medium text-foreground shadow-sm hover:bg-muted/60 hover:border-foreground/30 transition-colors"
        >
          Previous Sessions
        </Link>
      </div>
    </div>
  );
};

export default Index;
