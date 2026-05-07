import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { RequestWizard } from "@/components/guincho/RequestWizard";

export const Route = createFileRoute("/destino")({
  head: () => ({
    meta: [{ title: "Destino — Disk Guincho 24h" }],
  }),
  component: DestinoPage,
});

function DestinoPage() {
  // Sem travas: deixa acessar a página mesmo sem origem definida.
  useEffect(() => {}, []);

  return (
    <main className="app-bg min-h-screen">
      <RequestWizard />
    </main>
  );
}

