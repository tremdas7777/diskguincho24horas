import { createFileRoute } from "@tanstack/react-router";
import { RequestWizard } from "@/components/guincho/RequestWizard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Disk Guincho 24h — Todo Brasil" },
      {
        name: "description",
        content:
          "Guincho 24h em todo Brasil — atendimento rápido e seguro. Solicite com CEP/GPS, estimativa de preço e despacho imediato.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="app-bg min-h-screen">
      <RequestWizard />
    </main>
  );
}
