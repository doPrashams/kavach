import { HealthBadge } from "@/components/health-badge";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        Kavach — self-healing data platform
      </h1>
      <HealthBadge />
    </main>
  );
}
