import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/curiosidades-cgm")({
  head: () => ({
    meta: [
      { title: "Curiosidades sobre Sensor de Glicose Contínuo — Disk Guincho 24h" },
      {
        name: "description",
        content:
          "Descubra 10 curiosidades surpreendentes sobre o sensor de glicose contínuo (CGM): como funciona, vantagens e mitos.",
      },
      {
        property: "og:title",
        content: "Curiosidades sobre Sensor de Glicose Contínuo",
      },
      {
        property: "og:description",
        content:
          "10 fatos incríveis sobre CGM que você provavelmente não conhecia.",
      },
    ],
  }),
  component: CuriosidadesCGM,
});

const curiosities = [
  {
    num: "01",
    title: "Mede a glicose no fluido intersticial, não no sangue",
    body: "O sensor de CGM usa uma microagulha flexível que fica sob a pele e mede a glicose no fluido entre as células — o intersticial. A diferença de tempo entre a leitura do fluido intersticial e o sangue é de apenas alguns minutos.",
    highlight: "Fluido intersticial",
  },
  {
    num: "02",
    title: "Uma leitura a cada 5 minutos, 24h por dia",
    body: "Isso representa 288 leituras automáticas por dia, ou 8.640 leituras por mês. Compare com os 3-4 testes diários de glicemia tradicional e você terá uma visão muito mais completa do seu metabolismo.",
    highlight: "288 leituras/dia",
  },
  {
    num: "03",
    title: "A agulha é menor que uma costura de seda",
    body: "A microagulha do sensor mede cerca de 5mm de comprimento e é mais fina que um fio de costura comum. Por isso, a maioria das pessoas sente apenas um leve toque na aplicação.",
    highlight: "5 milímetros",
  },
  {
    num: "04",
    title: "Tecnologia usada por astronautas e atletas de elite",
    body: "A NASA já testou sensores de glicose contínuo em missões espaciais para monitorar astronautas. Atletas olímpicos também usam CGM para otimizar a performance e evitar quedas de energia durante treinos.",
    highlight: "NASA e Olimpíadas",
  },
  {
    num: "05",
    title: "Pode prever hipoglicemia antes dela acontecer",
    body: "Algoritmos modernos de CGM analisam a tendência da glicose em queda e enviam alertas 20-30 minutos antes de uma hipoglicemia real ocorrer, dando tempo para a pessoa se alimentar.",
    highlight: "Alerta preventivo",
  },
  {
    num: "06",
    title: "Resistente a água: pode nadar e tomar banho",
    body: "A maioria dos sensores modernos tem certificação IP27/IP28, o que significa que você pode nadar, tomar banho e praticar esportes aquáticos sem precisar remover o dispositivo.",
    highlight: "100% à prova d'água",
  },
  {
    num: "07",
    title: "Dura de 10 a 15 dias sem precisar trocar",
    body: "Sensores mais recentes como o FreeStyle Libre 2 e 3 duram até 14-15 dias. O sensor se auto-calibra durante todo o uso, eliminando a necessidade de calibrações com dedos.",
    highlight: "Até 15 dias",
  },
  {
    num: "08",
    title: "Pode ser lido pelo celular via NFC e Bluetooth",
    body: "Basta aproximar o celular do sensor para obter a leitura instantânea. Os modelos mais novos transmitem dados automaticamente via Bluetooth a cada minuto, sem necessidade de escanear.",
    highlight: "Leitura por aproximação",
  },
  {
    num: "09",
    title: "Ajuda a descobrir como alimentos afetam você",
    body: "Com o CGM, você vê em tempo real como cada alimento impacta sua glicose. Muitas pessoas descobrem surpreendentes picos causados por alimentos que achavam inofensivos, como frutas tropicais ou cereais.",
    highlight: "Mapa metabólico pessoal",
  },
  {
    num: "10",
    title: "O primeiro CGM comercial surgiu em 1999",
    body: "O Medtronic MiniMed lançado em 1999 foi o primeiro sensor de glicose contínuo aprovado para uso doméstico. Desde então, a tecnologia evoluiu de aparelhos grandes e incômodos para dispositivos do tamanho de duas moedas empilhadas.",
    highlight: "Evolução de 25 anos",
  },
];

function CuriosidadesCGM() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1a1a1a]">
      {/* Hero */}
      <header className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-3xl px-6 pb-14 pt-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#E8F4FD] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2EB7F1]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2EB7F1]" />
            Conhecimento
          </div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#0B0F17] sm:text-4xl">
            10 Curiosidades sobre{" "}
            <span className="text-[#2EB7F1]">Sensor de Glicose Contínuo</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[#64748B]">
            Descubra fatos surpreendentes sobre a tecnologia que está
            revolucionando o monitoramento da diabetes e da saúde metabólica.
          </p>
        </div>
      </header>

      {/* Timeline / Cards */}
      <main className="mx-auto max-w-3xl px-6 pb-20">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-6 hidden h-[calc(100%-48px)] w-0.5 bg-[#E2E8F0] md:left-[27px] md:block" />

          <div className="grid gap-8">
            {curiosities.map((c, i) => (
              <article
                key={c.num}
                className="group relative flex gap-5 md:gap-8"
              >
                {/* Number bubble */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#2EB7F1] bg-white text-sm font-bold text-[#2EB7F1] shadow-sm md:h-14 md:w-14 md:text-base">
                  {c.num}
                </div>

                {/* Card */}
                <div className="flex-1 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md md:p-8">
                  <div className="mb-3 inline-block rounded-lg bg-[#F0F9FF] px-3 py-1 text-xs font-semibold text-[#2EB7F1]">
                    {c.highlight}
                  </div>
                  <h2 className="text-lg font-bold leading-snug text-[#0B0F17] md:text-xl">
                    {c.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#475569] md:text-base">
                    {c.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-3xl bg-[#0B0F17] px-6 py-10 text-center md:px-10 md:py-14">
          <h3 className="text-xl font-bold text-white md:text-2xl">
            Já conhece o CGM GS1?
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#94A3B8] md:text-base">
            O sensor de glicose contínuo mais acessível do Brasil. Monitoramento
            24h com envio rápido para todo o país.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2EB7F1] px-8 text-sm font-bold text-white shadow-[0_10px_30px_rgba(46,183,241,0.35)] transition hover:bg-[#1DA1E0]"
            >
              Quero conhecer
            </Link>
            <Link
              to="/origem"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#334155] bg-transparent px-8 text-sm font-bold text-white transition hover:bg-[#1E293B]"
            >
              Solicitar guincho
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 text-center text-xs text-[#94A3B8]">
        Disk Guincho 24h — Informação educativa. Consulte sempre um médico.
      </footer>
    </div>
  );
}
