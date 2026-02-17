import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <h1 className="text-4xl font-bold text-foreground">Complex Mapper</h1>
      <p className="text-lg text-muted-foreground">Word association analysis tool</p>
      <div className="flex gap-4">
        <Link
          to="/demo"
          className="rounded-md bg-primary px-8 py-3 text-lg text-primary-foreground hover:opacity-90"
        >
          Start Demo
        </Link>
        <Link
          to="/sessions"
          className="rounded-md border border-border px-8 py-3 text-lg text-foreground hover:bg-muted"
        >
          Previous Sessions
        </Link>
      </div>
    </div>
  );
};

export default Index;
