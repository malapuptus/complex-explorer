import { Link } from "react-router-dom";
import { SessionsDrawer } from "@/app/SessionsDrawer";
import { BrandLogo } from "@/components/brand/BrandLogo";

const Index = () => {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4">
      {/* Sessions button top-right */}
      <div className="absolute right-5 top-5">
        <SessionsDrawer />
      </div>

      {/* Hero lockup */}
      <div className="flex flex-col items-center gap-3">
        <BrandLogo height={52} />
        <p className="text-sm tracking-widest text-muted-foreground uppercase">
          Word association analysis
        </p>
      </div>

      {/* Olive divider */}
      <div className="h-px w-40 bg-border/70" />

      {/* CTA buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/demo"
          className="rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/85 transition-colors"
        >
          Start Demo
        </Link>
        <Link
          to="/sessions"
          className="rounded-md border border-border bg-card px-8 py-3 text-base font-medium text-foreground shadow-sm hover:bg-accent/20 transition-colors"
        >
          Previous Sessions
        </Link>
      </div>
    </div>
  );
};

export default Index;
