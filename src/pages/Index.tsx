import { Link } from "react-router-dom";
import { SessionsDrawer } from "@/app/SessionsDrawer";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { JungMotif } from "@/components/brand/JungMotif";

const Index = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-4 overflow-hidden">
      {/* Jung motif watermark — home only, behind everything */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <JungMotif size={600} />
      </div>

      {/* Sessions button top-right */}
      <div className="absolute right-5 top-5 z-10">
        <SessionsDrawer />
      </div>

      {/* Hero lockup */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <BrandLogo height={52} />
        <p className="text-sm tracking-widest text-muted-foreground uppercase font-medium">
          Word association analysis
        </p>
      </div>

      {/* Olive divider */}
      <div className="relative z-10 h-px w-40 bg-border/60" />

      {/* CTA buttons */}
      <div className="relative z-10 flex flex-wrap justify-center gap-4">
        <Link
          to="/demo"
          className="rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          Start Demo
        </Link>
        <Link
          to="/sessions"
          className="rounded-md border border-border bg-card px-8 py-3 text-base font-medium text-foreground shadow-sm hover:bg-accent/15 transition-colors"
        >
          Previous Sessions
        </Link>
      </div>
    </div>
  );
};

export default Index;
