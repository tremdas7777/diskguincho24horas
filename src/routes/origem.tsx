import { createFileRoute } from "@tanstack/react-router";
import { RequestWizard } from "@/components/guincho/RequestWizard";

export const Route = createFileRoute("/origem")({
  head: () => ({
    meta: [{ title: "Origem — Disk Guincho 24h" }],
  }),
  component: OrigemPage,
});

function OrigemPage() {
  return (
    <main className="app-bg min-h-screen">
      <RequestWizard />
    </main>
  );
}

