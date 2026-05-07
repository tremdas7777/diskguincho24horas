
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { haversineKm, type LatLng } from "@/lib/guincho/geo";
import { maskCEP, maskPhoneBR, onlyDigits } from "@/lib/guincho/masks";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { PixModal } from "./PixModal";

const MapPanel = dynamic(() => import("./MapPanel").then((m) => m.MapPanel), {
  ssr: false,
});

type VehicleType =
  | "carro"
  | "moto"
  | "suv"
  | "caminhonete"
  | "caminhao_leve"
  | "caminhao_pesado";
type ProblemType =
  | "guincho"
  | "pane_seca"
  | "pane_eletrica"
  | "pneu"
  | "acidente"
  | "outro";

type Address = {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
  ref: string;
  coords?: LatLng;
};

const VEHICLES: Array<{ id: VehicleType; label: string; desc: string }> = [
  { id: "carro", label: "Carro", desc: "Passeio / hatch / sedã" },
  { id: "moto", label: "Moto", desc: "Motocicleta / scooter" },
  { id: "suv", label: "SUV", desc: "SUV / crossover" },
  { id: "caminhonete", label: "Caminhonete", desc: "Picape / utilitário" },
  { id: "caminhao_leve", label: "Caminhão leve", desc: "3/4 · VUC · leve" },
  { id: "caminhao_pesado", label: "Caminhão pesado", desc: "Pesado / grande porte" },
];

const PROBLEMS: Array<{ id: ProblemType; label: string }> = [
  { id: "guincho", label: "Guincho (apenas remoção/transporte)" },
  { id: "pane_seca", label: "Pane seca" },
  { id: "pane_eletrica", label: "Pane elétrica" },
  { id: "pneu", label: "Pneu (furo/troca)" },
  { id: "acidente", label: "Acidente / colisão" },
  { id: "outro", label: "Outro" },
];

function moneyBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcPriceBRL({
  km,
}: {
  km: number;
}) {
  // Regra fixa por faixa de distância
  // 0–5 km -> 100
  // 5–10 km -> 120
  // 10–20 km -> 180
  // 20–50 km -> 300
  // acima de 50 km -> 300 + 5 por km adicional
  const d = Math.max(0, km);
  if (d <= 5) return 100;
  if (d <= 10) return 120;
  if (d <= 20) return 180;
  if (d <= 50) return 300;
  return 300 + Math.ceil(d - 50) * 5;
}

function vehicleLabel(v: VehicleType) {
  if (v === "moto") return "Guincho Moto";
  if (v === "caminhao_pesado") return "Guincho Pesado";
  if (v === "caminhao_leve") return "Guincho Caminhão Leve";
  if (v === "caminhonete") return "Guincho Caminhonete";
  if (v === "suv") return "Guincho SUV";
  return "Guincho Carro";
}

function vehicleDesc(v: VehicleType) {
  if (v === "moto") return "Plataforma / suporte para motocicletas";
  if (v === "caminhao_pesado") return "Operação para veículos de grande porte";
  if (v === "caminhao_leve") return "Para VUC / 3/4 e leves";
  if (v === "caminhonete") return "Para picapes e utilitários";
  if (v === "suv") return "Para SUVs e crossovers";
  return "Carro de passeio";
}

function vehicleIcon(v: VehicleType) {
  if (v === "moto") return "🏍️";
  if (v === "caminhao_pesado") return "🚛";
  if (v === "caminhao_leve") return "🚚";
  if (v === "caminhonete") return "🛻";
  if (v === "suv") return "🚙";
  return "🚗";
}

function buildAddressLine(a: Address) {
  const parts = [
    a.street && a.number ? `${a.street}, ${a.number}` : a.street || "",
    a.neighborhood,
    a.city && a.state ? `${a.city} - ${a.state}` : a.city || a.state || "",
    a.cep ? `CEP ${a.cep}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

async function viacep(cepDigits: string) {
  const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
  if (!res.ok) throw new Error("ViaCEP failed");
  const data = (await res.json()) as any;
  if (data?.erro) return null;
  return data as {
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  };
}

async function geocode(q: string, signal?: AbortSignal) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as any;
  if (!data?.found) return null;
  return { lat: data.lat as number, lng: data.lng as number } satisfies LatLng;
}

function CardButton({
  title,
  desc,
  selected,
  onClick,
}: {
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative w-full rounded-2xl border px-4 py-4 text-left transition",
        selected
          ? "border-yellow-500/60 bg-yellow-500/10 shadow-[0_18px_60px_rgba(245,158,11,0.12)]"
          : "border-border bg-panel/90 hover:bg-white/5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-text">{title}</div>
          <div className="mt-1 text-sm text-muted">{desc}</div>
        </div>
        <div
          className={[
            "mt-1 h-6 w-6 rounded-full border transition",
            selected ? "border-yellow-400 bg-yellow-500" : "border-border",
          ].join(" ")}
        />
      </div>
    </button>
  );
}

function Field({
  label,
  children,
  labelClassName,
}: {
  label: string;
  children: React.ReactNode;
  labelClassName?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <div
        className={[
          "text-[11px] font-bold uppercase tracking-[0.12em] text-text/90",
          labelClassName ?? "",
        ].join(" ")}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-12 w-full rounded-xl border border-border bg-panel/90 px-3 text-[15px] text-text outline-none",
        "placeholder:text-white/70 focus:border-yellow-500/70 focus:ring-4 focus:ring-yellow-500/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-12 w-full rounded-xl border border-border bg-panel/90 px-3 text-[15px] text-text outline-none",
        "focus:border-yellow-500/70 focus:ring-4 focus:ring-yellow-500/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

const blankAddress = (): Address => ({
  cep: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  complement: "",
  ref: "",
});

export function RequestWizard() {
  const [step, setStep] = useState(0); // 0..5
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [vehicle, setVehicle] = useState<VehicleType>("carro");
  const [origin, setOrigin] = useState<Address>(() => blankAddress());
  const [dest, setDest] = useState<Address>(() => blankAddress());
  const [problem, setProblem] = useState<ProblemType>("pane_seca");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [followMe, setFollowMe] = useState(true);
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | undefined>(undefined);
  const gpsWatchIdRef = useRef<number | null>(null);
  const [originLabel, setOriginLabel] = useState<string>("");
  const [destQuery, setDestQuery] = useState<string>("");
  const sheetMaxHClass = step === 1 ? "max-h-[70vh]" : "max-h-[52vh]";

  const [dispatchPhase, setDispatchPhase] = useState<
    "idle" | "searching" | "options"
  >("idle");
  const [dispatchOptions, setDispatchOptions] = useState<
    Array<{ id: string; label: string; etaMin: number; note: string }>
  >([]);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string>("");

  const [pixOpen, setPixOpen] = useState(false);
  const [pixUrl, setPixUrl] = useState("");
  const [pixCopy, setPixCopy] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; from: "driver" | "user"; text: string; at: number }>
  >([]);
  const [towPos, setTowPos] = useState<LatLng | null>(null);
  const [towAddr, setTowAddr] = useState<string>("");
  const driverTimersRef = useRef<number[]>([]);

  const estimate = useMemo(() => {
    if (!origin.coords || !dest.coords) return null;
    const km = haversineKm(origin.coords, dest.coords);
    const price = calcPriceBRL({ km });
    const minutes = Math.max(12, Math.round((km / 40) * 60)); // simple ETA model
    return { km, minutes, price };
  }, [origin.coords, dest.coords]);

  const kmForPricing = useMemo(() => {
    if (!origin.coords || !dest.coords) return null;
    return haversineKm(origin.coords, dest.coords);
  }, [origin.coords, dest.coords]);

  function selectedOptionMultiplier() {
    if (selectedDispatchId === "opt_fast") return 1.18;
    if (selectedDispatchId === "opt_premium") return 1.28;
    if (selectedDispatchId === "opt_economy") return 0.9;
    return 1.0;
  }

  const canNext = useMemo(() => {
    // Liberado avançar entre etapas para montar o projeto (validações ficam nas ações)
    return true;
  }, []);

  async function fillByCEP(which: "origin" | "dest") {
    setErr(null);
    const current = which === "origin" ? origin : dest;
    const digits = onlyDigits(current.cep);
    if (digits.length !== 8) return;

    try {
      setBusy("Buscando CEP…");
      const r = await viacep(digits);
      if (!r) {
        setErr("CEP não encontrado.");
        return;
      }

      const next = {
        ...current,
        street: r.logradouro ?? current.street,
        neighborhood: r.bairro ?? current.neighborhood,
        city: r.localidade ?? current.city,
        state: r.uf ?? current.state,
      };

      if (which === "origin") setOrigin(next);
      else setDest(next);
    } catch {
      setErr("Não consegui consultar o CEP agora.");
    } finally {
      setBusy(null);
    }
  }

  async function useGPS() {
    setErr(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setErr(
        "GPS bloqueado: abra o site em HTTPS (ou em localhost) para permitir localização no celular.",
      );
      return;
    }
    if (!navigator.geolocation) {
      setErr("Seu navegador não suporta GPS.");
      return;
    }
    const prevWatch = gpsWatchIdRef.current;
    if (prevWatch != null) {
      try {
        navigator.geolocation.clearWatch(prevWatch);
      } catch {
        // ignore
      }
      gpsWatchIdRef.current = null;
    }
    setBusy("Ativando GPS…");
    setFollowMe(true);

    // Force a permission prompt + fast first fix, then keep updating like Uber/99
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin((o) => ({
          ...o,
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
        setGpsAccuracyM(pos.coords.accuracy);
      },
      () => {
        // ignore here; watchPosition will surface the detailed error below
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 },
    );

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setOrigin((o) => ({
          ...o,
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
        setGpsAccuracyM(pos.coords.accuracy);
        setBusy(null);
      },
      (e) => {
        setBusy(null);
        const code = (e as GeolocationPositionError | undefined)?.code;
        if (code === 1)
          setErr(
            "Permissão de localização negada. Ative o GPS/Localização no navegador e permita o acesso para este site.",
          );
        else if (code === 2)
          setErr(
            "Não foi possível obter sua localização (sinal fraco). Tente novamente ou digite a origem manualmente.",
          );
        else if (code === 3)
          setErr("GPS demorou para responder (timeout). Tente novamente.");
        else
          setErr(
            "Não consegui acessar sua localização. Permita o GPS e tente de novo.",
          );
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 },
    );
    gpsWatchIdRef.current = id;

    // Stop tracking after 3 minutes to avoid draining battery on demo.
    window.setTimeout(() => {
      try {
        navigator.geolocation.clearWatch(id);
      } catch {
        // ignore
      }
    }, 3 * 60 * 1000);
  }

  // Auto-start GPS (if previously allowed) for Uber-like experience
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;
    if (gpsWatchIdRef.current != null) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setOrigin((o) => ({
          ...o,
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
        setGpsAccuracyM(pos.coords.accuracy);
      },
      () => {
        // ignore on first load (user may deny)
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 },
    );
    gpsWatchIdRef.current = id;

    return () => {
      try {
        navigator.geolocation.clearWatch(id);
      } catch {
        // ignore
      }
      gpsWatchIdRef.current = null;
    };
  }, []);

  // When GPS origin updates, reverse geocode to show city/street automatically
  useEffect(() => {
    if (!origin.coords) return;
    const { lat, lng } = origin.coords;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/reverse?lat=${lat}&lng=${lng}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as any;
        const short = (data?.short as string) ?? "";
        if (short) setOriginLabel(short);
      } catch {
        // ignore
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [origin.coords]);

  // On final step, ensure map is pinned to the chosen addresses (if user skipped earlier steps).
  useEffect(() => {
    if (step !== 5) return;
    let cancelled = false;
    (async () => {
      try {
        // If user typed addresses but didn't confirm, try to geocode now.
        if (!origin.coords) await geocodeAddress("origin");
        if (!dest.coords) await geocodeAddress("dest");

        if (cancelled) return;

        // Ensure origin label shows city for trust.
        if (origin.coords && !originLabel) {
          const short = await reverseShort(origin.coords.lat, origin.coords.lng);
          if (!cancelled && short) setOriginLabel(short);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const gpsNeedsHttps =
    typeof window !== "undefined" &&
    window.location.protocol !== "https:" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  async function geocodeAddress(which: "origin" | "dest") {
    setErr(null);
    const a = which === "origin" ? origin : dest;
    const q = [
      a.street,
      a.number,
      a.neighborhood,
      a.city,
      a.state,
      onlyDigits(a.cep).length === 8 ? a.cep : "",
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");
    if (!q || q.length < 8) return;

    try {
      setBusy("Calculando no mapa…");
      const coords = await geocode(q);
      if (!coords) {
        setErr("Não consegui localizar esse endereço no mapa.");
        return;
      }
      if (which === "origin") setOrigin((o) => ({ ...o, coords }));
      else setDest((d) => ({ ...d, coords }));
    } finally {
      setBusy(null);
    }
  }

  // Auto-pin origin/dest on the map when user typed a valid address.
  // Debounced to avoid spamming Nominatim while the user is typing.
  const geocodeDebounceRef = useRef<{ origin?: number; dest?: number }>({});
  const geocodeAbortRef = useRef<{ origin?: AbortController | null; dest?: AbortController | null }>({
    origin: null,
    dest: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (origin.coords) return;

    const cepOk = onlyDigits(origin.cep).length === 8;
    const hasNumber = origin.number.trim().length > 0;
    const hasCityState = origin.city.trim().length > 0 && origin.state.trim().length > 0;
    const q = [
      origin.street,
      origin.number,
      origin.neighborhood,
      origin.city,
      origin.state,
      cepOk ? origin.cep : "",
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");

    if (!q || q.length < 8) return;
    if (!(hasNumber && (cepOk || hasCityState))) return;

    if (geocodeDebounceRef.current.origin)
      window.clearTimeout(geocodeDebounceRef.current.origin);

    geocodeDebounceRef.current.origin = window.setTimeout(async () => {
      try {
        geocodeAbortRef.current.origin?.abort();
        const ac = new AbortController();
        geocodeAbortRef.current.origin = ac;

        const coords = await geocode(q, ac.signal);
        if (!coords) return;
        setOrigin((o) => ({ ...o, coords }));
      } catch {
        // ignore: typing / aborts / transient failures
      }
    }, 650);

    return () => {
      if (geocodeDebounceRef.current.origin)
        window.clearTimeout(geocodeDebounceRef.current.origin);
    };
  }, [
    origin.coords,
    origin.cep,
    origin.number,
    origin.street,
    origin.neighborhood,
    origin.city,
    origin.state,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dest.coords) return;

    const cepOk = onlyDigits(dest.cep).length === 8;
    const hasNumber = dest.number.trim().length > 0;
    const hasCityState = dest.city.trim().length > 0 && dest.state.trim().length > 0;
    const q = [
      dest.street,
      dest.number,
      dest.neighborhood,
      dest.city,
      dest.state,
      cepOk ? dest.cep : "",
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");

    if (!q || q.length < 8) return;
    if (!(hasNumber && (cepOk || hasCityState))) return;

    if (geocodeDebounceRef.current.dest)
      window.clearTimeout(geocodeDebounceRef.current.dest);

    geocodeDebounceRef.current.dest = window.setTimeout(async () => {
      try {
        geocodeAbortRef.current.dest?.abort();
        const ac = new AbortController();
        geocodeAbortRef.current.dest = ac;

        const coords = await geocode(q, ac.signal);
        if (!coords) return;
        setDest((d) => ({ ...d, coords }));
      } catch {
        // ignore
      }
    }, 650);

    return () => {
      if (geocodeDebounceRef.current.dest)
        window.clearTimeout(geocodeDebounceRef.current.dest);
    };
  }, [dest.coords, dest.cep, dest.number, dest.street, dest.neighborhood, dest.city, dest.state]);

  function next() {
    if (!canNext) return;
    setErr(null);
    setStep((s) => Math.min(5, s + 1));
  }

  // when user completes step 3 (problema/contato), automatically start "procurando guinchos…"
  useEffect(() => {
    if (step !== 4) return;
    if (dispatchPhase !== "idle") return;
    if (!origin.coords || !estimate) return;
    void searchAndShowOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function back() {
    setErr(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function reverseShort(lat: number, lng: number) {
    const res = await fetch(`/api/reverse?lat=${lat}&lng=${lng}`, {
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = (await res.json()) as any;
    return (data?.short as string) ?? "";
  }

  // (sem simulação de motorista aqui – o funil termina no Pix)

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      driverTimersRef.current.forEach((t) => window.clearTimeout(t));
      driverTimersRef.current = [];
    };
  }, []);

  // When payment is confirmed, open the driver chat automatically (step 5)
  useEffect(() => {
    if (step !== 5) return;
    if (!paymentDone) return;
    if (chatMessages.length) return;
    const now = Date.now();
    setChatMessages([
      {
        id: `m_${now}_1`,
        from: "driver",
        text: "Olá! Sou o motorista do guincho. Já estou a caminho. Pode me confirmar um ponto de referência?",
        at: now,
      },
    ]);
  }, [step, paymentDone, chatMessages.length]);

  function sendChat() {
    const msg = chatText.trim();
    if (!msg) return;
    const now = Date.now();
    setChatText("");
    setChatMessages((m) => [
      ...m,
      { id: `m_${now}_u`, from: "user", text: msg, at: now },
    ]);
    // Simulate driver reply
    driverTimersRef.current.push(
      window.setTimeout(() => {
        setChatMessages((m) => [
          ...m,
          {
            id: `m_${Date.now()}_d`,
            from: "driver",
            text: "Perfeito, recebido. Estou chegando — qualquer coisa me avise por aqui.",
            at: Date.now(),
          },
        ]);
      }, 800),
    );
  }

  async function payBeehivePix() {
    setErr(null);
    // Fluxo sem travas: se ainda não houver estimativa, segue com um valor simbólico.
    try {
      setBusy("Gerando Pix…");
      setPaymentDone(false);
      const mult = selectedOptionMultiplier();
      const base = estimate?.price ?? 1;
      const amount = Math.round(base * mult * 100) / 100;
      const res = await fetch("/api/pay/beehive/pix-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Guincho 24h (${vehicle}) — ${(estimate?.km ?? 0).toFixed(1)} km`,
          amountCents: Math.round(amount * 100),
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        // Sem travas: se o gateway falhar/não estiver configurado, abre Pix demo.
        const demo = `pix-demo:${Date.now()}`;
        setPixUrl(demo);
        setPixCopy(demo);
        setPixOpen(true);
        return;
      }
      if (data?.url) {
        setPixUrl(String(data.url));
        // fallback: copy is the same URL if Beehive doesn't expose the Pix payload here
        setPixCopy(String(data.url));
        setPixOpen(true);
      } else setErr("Link de pagamento inválido.");
    } catch {
      // Sem travas: em erro geral, abre Pix demo.
      const demo = `pix-demo:${Date.now()}`;
      setPixUrl(demo);
      setPixCopy(demo);
      setPixOpen(true);
    } finally {
      setBusy(null);
    }
  }

  async function searchAndShowOptions() {
    setErr(null);
    // Fluxo sem travas: se faltar origem/estimativa, ainda assim mostra opções.

    // ensure we are on step 4 (preço/pagamento) when searching
    setStep(4);
    setDispatchPhase("searching");
    setBusy("Procurando guincho disponível na sua região…");
    await new Promise((r) => setTimeout(r, 1400));
    setBusy("Analisando distância e disponibilidade…");
    await new Promise((r) => setTimeout(r, 1100));
    setBusy("Encontrando melhores opções…");
    await new Promise((r) => setTimeout(r, 900));

    const baseEta = Math.max(
      6,
      Math.min(25, Math.round(((estimate?.minutes ?? 14) as number) / 2)),
    );
    const opts = [
      {
        id: "opt_fast",
        label: "Guincho rápido",
        etaMin: Math.max(4, baseEta - 2),
        note: "Chega mais rápido (prioridade)",
      },
      {
        id: "opt_premium",
        label: "Guincho premium",
        etaMin: Math.max(6, baseEta + 1),
        note: "Motorista melhor avaliado",
      },
      {
        id: "opt_economy",
        label: "Guincho econômico",
        etaMin: Math.max(8, baseEta + 5),
        note: "Melhor preço",
      },
    ];
    setDispatchOptions(opts);
    setSelectedDispatchId(opts[0].id);
    setBusy(null);
    setDispatchPhase("options");
  }

  const whatsappMessage = useMemo(() => {
    const problemLabel = PROBLEMS.find((p) => p.id === problem)?.label ?? problem;
    const lines = [
      "Olá! Quero solicitar um guincho 24h.",
      `Veículo: ${vehicle}`,
      `Problema: ${problemLabel}`,
      origin.coords ? "Origem: (GPS)" : `Origem: ${buildAddressLine(origin)}`,
      `Destino: ${buildAddressLine(dest)}`,
      estimate
        ? `Estimativa: ${estimate.km.toFixed(1)} km · ${estimate.minutes} min · ${moneyBRL(estimate.price)}`
        : "",
      `Nome: ${name}`,
      `Telefone: ${phone}`,
      notes ? `Obs: ${notes}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }, [vehicle, problem, origin, dest, estimate, name, phone, notes]);

  return (
    <div className="group relative isolate min-h-screen overflow-hidden bg-bg">
      {/* MAPA FULLSCREEN */}
      <div className="absolute inset-0 z-0">
        <MapPanel
          origin={origin.coords ?? undefined}
          dest={dest.coords ?? undefined}
          tow={towPos ?? undefined}
          accuracyM={gpsAccuracyM}
          followOrigin={followMe}
          className="h-full w-full"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,153,255,0.10), rgba(0,153,255,0.00) 45%, rgba(0,153,255,0.32))",
          }}
        />
      </div>

      {/* TOP SEARCH BAR (estilo Uber/99) */}
      <div className="pointer-events-none relative z-30 px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-3xl border border-border bg-panel/90 p-3 shadow-soft backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="grid h-9 w-9 place-items-center rounded-2xl border border-border bg-panel/90 text-text"
                  aria-label="Menu"
                  title="Menu"
                >
                  ☰
                </button>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-yellow-400 to-yellow-500 shadow-[0_2px_14px_rgba(245,158,11,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] ring-2 ring-yellow-200/80">
                <Image
                  src="/logo-guincho.png"
                  alt="Disk Guincho"
                  fill
                  className="object-cover object-center scale-[1.28]"
                  sizes="40px"
                  priority
                />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-text">Disk Guincho</div>
                <div className="text-xs text-muted">24h · Todo Brasil</div>
              </div>
            </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="shrink-0 text-xs text-muted">{step + 1}/6</div>
              </div>
          </div>

          <div className="mt-3 grid gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-panel/90 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <div className="flex-1 text-sm text-muted">
                {origin.coords
                  ? originLabel
                    ? `Origem: ${originLabel}`
                    : "Origem (GPS confirmado)"
                  : origin.street || origin.cep
                    ? `Origem: ${buildAddressLine(origin) || origin.cep}`
                    : "Defina a origem (GPS ou endereço)"}
              </div>
              <button
                type="button"
                onClick={useGPS}
                className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-semibold text-black"
              >
                GPS
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-xl border border-border bg-panel/90 px-3 py-2 text-xs font-semibold text-text"
                title="Editar origem"
              >
                Origem
              </button>
              <button
                type="button"
                onClick={() => setFollowMe((v) => !v)}
                className="rounded-xl border border-border bg-panel/90 px-3 py-2 text-xs font-semibold text-text"
                title="Seguir no mapa"
              >
                {followMe ? "Seguir" : "Livre"}
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-border bg-panel/90 px-3 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-white/70" />
              <div className="flex-1 text-sm text-muted">
                {dest.coords
                  ? `Destino: ${destQuery || buildAddressLine(dest) || "Selecionado"}`
                  : "Defina o destino (endereço)"}
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-border bg-panel/90 px-3 py-2 text-xs font-semibold text-text"
                title="Escolher destino"
              >
                Destino
              </button>
            </div>
          </div>
        </div>
      </div>

      {err ? (
        <div className="pointer-events-none relative z-30 px-4 pt-3">
          <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
        </div>
      ) : null}

      {gpsNeedsHttps ? (
        <div className="pointer-events-none relative z-30 px-4 pt-3">
          <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-panel/90 px-4 py-3 text-sm text-muted backdrop-blur">
            Para GPS real no celular, normalmente precisa abrir em <span className="text-text font-semibold">HTTPS</span>.
            No PC funciona em <span className="text-text font-semibold">localhost</span>.
          </div>
        </div>
      ) : null}

      {busy && !(step === 4 && dispatchPhase === "searching") ? (
        <div className="pointer-events-none relative z-30 px-4 pt-3">
          <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-panel/90 px-4 py-3 text-sm text-muted">
          {busy}
        </div>
        </div>
      ) : null}

      {/* BOTTOM SHEET */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="pointer-events-auto mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-panel/90 shadow-soft backdrop-blur">
          <div className="p-4">
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
              Solicitar guincho
            </div>
            <div className="mt-1 text-base font-semibold text-text">
              {step === 0 && "Selecione a origem"}
              {step === 1 && "Selecione o destino"}
              {step === 2 && "Escolha o seu veículo"}
              {step === 3 && "Problema e contato"}
              {step === 4 &&
                (dispatchPhase === "searching"
                  ? "Procurando guinchos…"
                  : dispatchPhase === "options"
                    ? "Guinchos encontrados na região"
                    : "Preço e pagamento")}
              {step === 5 && "Buscando / guincho a caminho"}
            </div>
          </div>

          <div className="mb-4 h-2 w-full rounded-full bg-white/5">
            <div
              className="h-2 rounded-full bg-yellow-500 transition-all"
              style={{ width: `${((step + 1) / 6) * 100}%` }}
            />
          </div>

          {/* On small screens, prevent the sheet from colliding with the top bar */}
          <div className={`${sheetMaxHClass} overflow-y-auto overscroll-contain pr-1`}>
            <div className="grid gap-3">
        {step === 2 ? (
          <div className="grid gap-3">
            {VEHICLES.map((v) => (
              <CardButton
                key={v.id}
                title={v.label}
                desc={v.desc}
                selected={vehicle === v.id}
                onClick={() => {
                  setVehicle(v.id);
                  // etapas obrigatórias: origem -> destino -> veículo -> problema/contato
                  // se ainda faltar alguma confirmação, leva o usuário para a etapa faltante
                  if (!origin.coords && !onlyDigits(origin.cep).length) {
                    setStep(0);
                    return;
                  }
                  if (!dest.coords && !onlyDigits(dest.cep).length) {
                    setStep(1);
                    return;
                  }
                  setStep(3);
                }}
              />
            ))}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-4">
            <button
              type="button"
              onClick={useGPS}
              className="h-12 w-full rounded-xl bg-yellow-500 font-semibold text-black hover:bg-yellow-400"
            >
              Usar minha localização (GPS)
            </button>

            <div className="grid grid-cols-2 gap-3">
              <Field label="CEP (origem)">
                <Input
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={origin.cep}
                  onChange={(e) =>
                    setOrigin((o) => ({ ...o, cep: maskCEP(e.target.value) }))
                  }
                  onBlur={() => void fillByCEP("origin")}
                />
              </Field>
              <Field label="Número">
                <Input
                  inputMode="numeric"
                  placeholder="Ex: 120"
                  value={origin.number}
                  onChange={(e) =>
                    setOrigin((o) => ({ ...o, number: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Rua">
              <Input
                placeholder="Auto (ViaCEP) ou digite"
                value={origin.street}
                onChange={(e) =>
                  setOrigin((o) => ({ ...o, street: e.target.value }))
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade">
                <Input
                  placeholder="Auto"
                  value={origin.city}
                  onChange={(e) =>
                    setOrigin((o) => ({ ...o, city: e.target.value }))
                  }
                />
              </Field>
              <Field label="UF">
                <Input
                  placeholder="UF"
                  value={origin.state}
                  onChange={(e) =>
                    setOrigin((o) => ({ ...o, state: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Referência (opcional)">
              <Input
                placeholder="Ex: posto, km, loja, ponto…"
                value={origin.ref}
                onChange={(e) =>
                  setOrigin((o) => ({ ...o, ref: e.target.value }))
                }
              />
            </Field>

            <button
              type="button"
              onClick={() => void geocodeAddress("origin")}
              className="h-12 w-full rounded-xl border border-border bg-panel/90 font-semibold hover:bg-white/5"
            >
              Confirmar origem no mapa
            </button>

            {origin.coords ? (
              <div className="rounded-2xl border border-border bg-panel/90 px-4 py-3 text-sm text-muted">
                Origem confirmada no mapa.
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-border bg-panel/90">
              <div className="px-4 py-3 text-sm font-semibold text-muted">
                Mapa (origem)
              </div>
              <MapPanel
                origin={origin.coords ?? undefined}
                followOrigin={true}
                className="h-[220px] w-full"
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Buscar destino (rápido)
              </div>
              <AddressAutocomplete
                placeholder="Digite rua, bairro, cidade…"
                value={destQuery}
                onChange={setDestQuery}
                bias={origin.coords ?? undefined}
                onPick={({ label, coords, address }) => {
                  setDestQuery(label);
                  setDest((d) => ({
                    ...d,
                    coords,
                    street: address?.road ?? d.street,
                    neighborhood:
                      address?.suburb ??
                      address?.neighbourhood ??
                      d.neighborhood,
                    city: address?.city ?? address?.town ?? address?.village ?? d.city,
                    state: address?.state?.slice?.(0, 2) ?? d.state,
                  }));
                }}
              />
              <div className="text-xs text-muted">
                Dica: comece digitando e escolha uma sugestão.
              </div>
            </div>

            <div className="h-px bg-border/70" />

            <div className="grid grid-cols-2 gap-3">
              <Field label="CEP (destino)">
                <Input
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={dest.cep}
                  onChange={(e) =>
                    setDest((d) => ({ ...d, cep: maskCEP(e.target.value) }))
                  }
                  onBlur={() => void fillByCEP("dest")}
                />
              </Field>
              <Field label="Número">
                <Input
                  inputMode="numeric"
                  placeholder="Ex: 500"
                  value={dest.number}
                  onChange={(e) =>
                    setDest((d) => ({ ...d, number: e.target.value }))
                  }
                />
              </Field>
            </div>

            <Field label="Rua">
              <Input
                placeholder="Auto (ViaCEP) ou digite"
                value={dest.street}
                onChange={(e) =>
                  setDest((d) => ({ ...d, street: e.target.value }))
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade">
                <Input
                  placeholder="Auto"
                  value={dest.city}
                  onChange={(e) =>
                    setDest((d) => ({ ...d, city: e.target.value }))
                  }
                />
              </Field>
              <Field label="UF">
                <Input
                  placeholder="UF"
                  value={dest.state}
                  onChange={(e) =>
                    setDest((d) => ({ ...d, state: e.target.value }))
                  }
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => void geocodeAddress("dest")}
              className="h-12 w-full rounded-xl border border-border bg-panel/90 font-semibold hover:bg-white/5"
            >
              Confirmar destino no mapa
            </button>

            {dest.coords ? (
              <div className="rounded-2xl border border-border bg-panel/90 px-4 py-3 text-sm text-muted">
                Destino confirmado no mapa.
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-panel/90 px-4 py-3 text-sm text-muted">
              O preço muda conforme a distância (origem → destino). Confirme o destino no mapa para calcular.
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4">
            <Field label="Problema">
              <Select
                value={problem}
                onChange={(e) => setProblem(e.target.value as ProblemType)}
              >
                {PROBLEMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Nome">
              <Input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Telefone (WhatsApp)">
              <Input
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
              />
            </Field>

            <Field label="Observações (opcional)">
              <Input
                placeholder="Ex: carro não liga, portão, ponto de referência…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3">
            {dispatchPhase !== "searching" ? (
              <div className="rounded-2xl border border-border bg-panel/90 px-4 py-3 text-sm text-muted">
                {kmForPricing ? (
                  <>
                    Distância estimada:{" "}
                    <span className="font-semibold text-text">
                      {kmForPricing.toFixed(1)} km
                    </span>{" "}
                    · Chegada aprox.:{" "}
                    <span className="font-semibold text-text">
                      {estimate?.minutes ?? "-"} min
                    </span>
                  </>
                ) : (
                  "Confirme origem e destino no mapa para calcular preço."
                )}
              </div>
            ) : null}

            {dispatchPhase === "searching" ? (
              <div
                className="grid place-items-center gap-4 rounded-2xl border border-border bg-panel/90 px-6 py-10"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="relative h-32 w-32">
                  <div className="absolute inset-0 animate-ping rounded-full bg-yellow-500/30 blur-md" />
                  <div className="relative z-[1] h-full w-full overflow-hidden rounded-full bg-gradient-to-b from-yellow-400 to-yellow-500 shadow-[0_4px_24px_rgba(245,158,11,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] ring-4 ring-yellow-200/70 [&_img]:pointer-events-none">
                    <Image
                      src="/logo-guincho.png"
                      alt=""
                      fill
                      className="animate-guincho-search object-cover object-center scale-[1.26]"
                      sizes="128px"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="max-w-[260px] text-center text-sm font-semibold leading-snug text-text">
                  {busy ?? "Procurando guinchos disponíveis…"}
                </div>
              </div>
            ) : null}

            {dispatchPhase === "options" ? (
              <div className="grid gap-2">
                {dispatchOptions.map((o) => {
                  const selected = selectedDispatchId === o.id;
                  const base = estimate?.price ?? 0;
                  const mult =
                    o.id === "opt_fast"
                      ? 1.18
                      : o.id === "opt_premium"
                        ? 1.28
                        : o.id === "opt_economy"
                          ? 0.9
                          : 1.0;
                  const optionPrice = base ? Math.round(base * mult * 100) / 100 : 0;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSelectedDispatchId(o.id);
                        // Após selecionar a opção, abre o Pix automaticamente
                        window.setTimeout(() => {
                          void payBeehivePix();
                        }, 120);
                      }}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition",
                        selected
                          ? "border-yellow-500/60 bg-yellow-500/10"
                          : "border-border bg-panel/90 hover:bg-white/5",
                      ].join(" ")}
                    >
                      <div>
                        <div className="font-semibold text-text">{o.label}</div>
                        <div className="mt-0.5 text-xs text-muted">{o.note}</div>
                      </div>
                      <div className="text-right">
                        {estimate ? (
                          <div className="text-sm font-semibold text-text">
                            {moneyBRL(optionPrice)}
                          </div>
                        ) : null}
                        <div className="text-sm font-semibold text-text">
                          {o.etaMin} min
                        </div>
                        <div className="text-xs text-muted">ETA</div>
                      </div>
                    </button>
                  );
                })}

                {/* CTA principal fica no botão "Continuar" embaixo */}
              </div>
            ) : dispatchPhase !== "searching" ? (
              <div className="grid gap-2">
                <div className="rounded-2xl border border-border bg-panel/90 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-panel/70 text-xl">
                        {vehicleIcon(vehicle)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-text">
                          {vehicleLabel(vehicle)}
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {vehicleDesc(vehicle)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-text">
                        {estimate ? moneyBRL(estimate.price) : "—"}
                      </div>
                      <div className="text-xs text-muted">Total</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Para trocar o veículo, volte em <span className="text-text font-semibold">“Escolha o seu veículo”</span>.
                  </div>
                </div>

                {/* CTA principal fica no botão "Continuar" embaixo */}
              </div>
            ) : null}

            {dispatchPhase !== "searching" ? (
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-12 flex-1 rounded-2xl border border-border bg-panel/90 px-4 text-sm font-semibold text-text hover:bg-white/5"
                >
                  Editar dados
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-panel/90">
              <div className="px-4 py-3 text-sm font-semibold text-muted">
                Confirmação
              </div>
              <MapPanel
                origin={origin.coords ?? undefined}
                dest={dest.coords ?? undefined}
                tow={towPos ?? undefined}
                followOrigin={true}
                className="h-[280px] w-full"
              />
            </div>

            <div className="rounded-2xl border border-border bg-panel/90 px-4 py-3 text-sm text-text backdrop-blur">
              <div>
                <span className="font-semibold">
                  Sua cidade:
                </span>{" "}
                <span>
                  {originLabel ||
                    (origin.city && origin.state
                      ? `${origin.city} - ${origin.state}`
                      : origin.city || origin.state || "—")}
                </span>
              </div>
              <div className="mt-1">
                <span className="font-semibold">
                  Local escolhido:
                </span>{" "}
                <span>
                  {origin.coords
                    ? "Origem confirmada no mapa"
                    : buildAddressLine(origin) || "—"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-panel/90 p-4 text-sm text-text backdrop-blur">
              <div className="font-semibold">Status do chamado</div>
              <div className="mt-2">
                {paymentDone
                  ? "Pagamento confirmado. Seu chamado foi registrado."
                  : "Pagamento iniciado. Finalize o Pix para confirmar o chamado."}
              </div>
            </div>

            {paymentDone ? (
              <div className="rounded-2xl border border-border bg-panel/90 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-semibold text-text">
                    Chat com o motorista
                  </div>
                  <div className="text-xs text-muted">Online</div>
                </div>

                <div className="grid gap-2 rounded-2xl border border-border bg-panel/90 p-3">
                  <div className="max-h-[220px] overflow-y-auto overscroll-contain pr-1">
                    <div className="grid gap-2">
                      {chatMessages.map((m) => (
                        <div
                          key={m.id}
                          className={[
                            "max-w-[92%] rounded-2xl px-3 py-2 text-sm",
                            m.from === "user"
                              ? "ml-auto bg-yellow-500 text-black"
                              : "mr-auto border border-border bg-panel/70 text-text",
                          ].join(" ")}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={chatText}
                      placeholder="Digite uma mensagem…"
                      onChange={(e) => setChatText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendChat();
                      }}
                    />
                    <button
                      type="button"
                      onClick={sendChat}
                      className="h-10 shrink-0 rounded-xl bg-yellow-500 px-4 text-sm font-semibold text-black hover:bg-yellow-400"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0 || step === 5}
              className="h-12 flex-1 rounded-xl border border-border bg-panel/90 font-semibold text-text disabled:opacity-40"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => {
                if (step === 5) {
                  // Concluir chamado → novo chamado
                  setErr(null);
                  setBusy(null);
                  setDispatchPhase("idle");
                  setDispatchOptions([]);
                  setSelectedDispatchId("");
                  setPixOpen(false);
                  setPixUrl("");
                  setPixCopy("");
                  setPaymentDone(false);
                  setChatText("");
                  setChatMessages([]);
                  setTowPos(null);
                  setTowAddr("");
                  setOrigin(() => blankAddress());
                  setDest(() => blankAddress());
                  setOriginLabel("");
                  setDestQuery("");
                  setStep(0);
                  return;
                }
                if (step === 4) {
                  // Sem travas: sempre permite buscar opções e iniciar pagamento.
                  if (dispatchPhase === "options") {
                    if (!selectedDispatchId && dispatchOptions.length) {
                      setSelectedDispatchId(dispatchOptions[0].id);
                    }
                    void payBeehivePix();
                    return;
                  }
                  void searchAndShowOptions();
                  return;
                }
                next();
              }}
              disabled={
                Boolean(busy) ||
                false
              }
              className="h-12 flex-[1.4] rounded-xl bg-yellow-500 font-semibold text-black hover:bg-yellow-400 disabled:opacity-50"
            >
              {step === 4
                ? dispatchPhase === "options"
                  ? "Pagar com Pix"
                  : dispatchPhase === "searching"
                    ? "Procurando guinchos…"
                    : "Procurar guincho"
                : step === 5
                  ? "Concluir chamado"
                  : "Continuar"}
            </button>
          </div>

          <div className="mt-3 text-center text-xs text-muted">
            Dica: confirme origem e destino no mapa para o preço mudar pela distância.
          </div>
          </div>
        </div>
      </div>

      <PixModal
        open={pixOpen}
        onClose={() => setPixOpen(false)}
        title="Guincho 24h (Pix)"
        amountLabel={
          estimate
            ? `Total: ${moneyBRL(
                Math.round(estimate.price * selectedOptionMultiplier() * 100) / 100,
              )}`
            : ""
        }
        pixUrl={pixUrl}
        copyText={pixCopy}
        paidFollowupHint="Assim que o pagamento for concluído, abrirá um chat com o motorista."
        onPaid={() => {
          setPaymentDone(true);
          setPixOpen(false);
          setStep(5);
        }}
      />
    </div>
  );
}

