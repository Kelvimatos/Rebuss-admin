import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.js";
import {
  scaleGeneratorApi,
  LocateResponse,
  TransitStationResult,
  GeocodedCandidate,
} from "../services/scale-generator.service.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card.js";
import { ErrorBoundary } from "../components/common/ErrorBoundary.js";
import { Badge } from "../components/ui/Badge.js";
import { Button } from "../components/ui/Button.js";
import { Input } from "../components/ui/Input.js";
import {
  MapPin,
  Search,
  Copy,
  Check,
  Trash2,
  Train,
  Bus,
  Navigation,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  X,
  History,
  RotateCcw,
  Footprints,
  Compass,
} from "lucide-react";

interface ScaleHistoryItem {
  id: string;
  store: string;
  date: string;
  time: string;
  addressInput: string;
  resolvedAddress: string;
  cityState: string;
  stationName?: string | null;
  stationSummary?: string | null;
  message: string;
  createdAt: string;
}

const HISTORY_STORAGE_KEY = "rebuss_ops_scale_history_v2";
const OPERATOR_NAME_KEY = "rebuss_ops_operator_signature";

const CITY_HINTS = [
  { label: "Detectar pelo endereço (Automático)", city: "", state: "" },
  { label: "São Paulo — SP", city: "São Paulo", state: "SP" },
  { label: "Rio de Janeiro — RJ", city: "Rio de Janeiro", state: "RJ" },
  { label: "Brasília — DF", city: "Brasília", state: "DF" },
  { label: "São José dos Campos — SP", city: "São José dos Campos", state: "SP" },
  { label: "Belo Horizonte — MG", city: "Belo Horizonte", state: "MG" },
  { label: "Goiânia — GO", city: "Goiânia", state: "GO" },
  { label: "Curitiba — PR", city: "Curitiba", state: "PR" },
  { label: "Campinas — SP", city: "Campinas", state: "SP" },
];

const QUICK_NOTES = [
  "Levar documento original com foto.",
  "Traje: camiseta preta lisa, calça jeans escura e calçado fechado.",
  "Chegar com 15 minutos de antecedência.",
  "Ao chegar, procurar o supervisor da operação.",
];

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getWeekdayName(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  const dateObj = new Date(y, m, d);
  const days = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];
  return days[dateObj.getDay()] || "";
}

function formatDateBr(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildStationLineForMessage(station: TransitStationResult): string {
  const icon =
    station.transportType === "TERMINAL_ONIBUS"
      ? "🚌"
      : station.transportType === "METRO"
      ? "🚇"
      : "🚆";

  const lineInfo = station.line ? ` (Linha ${station.line})` : "";

  let distanceInfo = "";
  if (station.routeVerified && station.walkingDistanceMeters !== null) {
    const walkDist = formatDistance(station.walkingDistanceMeters);
    const walkTime =
      station.walkingDurationMinutes !== null
        ? `, ~${station.walkingDurationMinutes} min a pé`
        : "";
    distanceInfo = ` — ${walkDist} por trajeto a pé${walkTime}`;
  } else {
    distanceInfo = ` — aprox. ${formatDistance(
      station.straightDistanceMeters
    )} em linha reta`;
  }

  return `${icon} *${station.transportLabel} de referência:* ${station.name}${lineInfo}${distanceInfo}`;
}

export const GeradorEscalasTool: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Today's date in YYYY-MM-DD
  const todayIso = new Date().toISOString().split("T")[0];

  // Step 1 — Operational Scale Fields
  const [operatorName, setOperatorName] = useState<string>(() => {
    const saved = localStorage.getItem(OPERATOR_NAME_KEY);
    if (saved) return saved;
    if (user?.nome) return user.nome.split(" ")[0];
    return "Equipe Rebuss";
  });
  const [storeName, setStoreName] = useState("");
  const [scaleDate, setScaleDate] = useState(todayIso);
  const [scaleTime, setScaleTime] = useState("08:00");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [customMapsUrl, setCustomMapsUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2 — Address & Geolocation State
  const [addressInput, setAddressInput] = useState("");
  const [selectedHintIdx, setSelectedHintIdx] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [locateResult, setLocateResult] = useState<LocateResponse | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [includeStationInMsg, setIncludeStationInMsg] = useState(true);
  const [includeRouteLinkInMsg, setIncludeRouteLinkInMsg] = useState(true);

  // Step 3 — Message Preview & Manual Edit Preservation
  const [messageText, setMessageText] = useState("");
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const lastStationLineRef = useRef<string | null>(null);

  // History State
  const [history, setHistory] = useState<ScaleHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Concurrency control for address lookups
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const lastSearchedKeyRef = useRef<string>("");
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedStation: TransitStationResult | null =
    locateResult?.stations?.find((s) => s.id === selectedStationId) || null;

  // Save operator signature preference
  useEffect(() => {
    if (operatorName.trim()) {
      localStorage.setItem(OPERATOR_NAME_KEY, operatorName.trim());
    }
  }, [operatorName]);

  // Save history to localStorage
  const persistHistory = useCallback((items: ScaleHistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, []);

  // Build standardized message from current fields
  const buildAutomaticMessage = useCallback((): string => {
    const lines: string[] = [];
    lines.push(`${getGreeting()}! Segue sua escala operacional:`);
    lines.push("");

    if (scaleDate) {
      const dateFormatted = formatDateBr(scaleDate);
      const weekday = getWeekdayName(scaleDate);
      const timePart = scaleTime ? ` às *${scaleTime}*` : "";
      lines.push(
        `📅 *Data:* ${dateFormatted}${weekday ? ` (${weekday})` : ""}${timePart}`
      );
    } else if (scaleTime) {
      lines.push(`⏰ *Horário:* ${scaleTime}`);
    }

    if (storeName.trim()) {
      lines.push(`🏪 *Local / Operação:* ${storeName.trim()}`);
    }

    const isConfirmed = locateResult?.status === "CONFIRMADO";
    const addressToUse = addressInput.trim();
    if (addressToUse) {
      if (isConfirmed && locateResult?.location) {
        const cityStateFromResult =
          locateResult.location.city && locateResult.location.state
            ? `${locateResult.location.city}/${locateResult.location.state}`
            : "";

        const alreadyHasCityState =
          cityStateFromResult &&
          (addressToUse
            .toLowerCase()
            .includes(locateResult.location.city!.toLowerCase()) ||
            /^https?:\/\//i.test(addressToUse));

        const displayAddr =
          /^https?:\/\//i.test(addressToUse) && locateResult.location.formattedAddress
            ? locateResult.location.formattedAddress
            : addressToUse;

        lines.push(
          `📍 *Endereço:* ${displayAddr}${
            cityStateFromResult && !alreadyHasCityState ? ` — ${cityStateFromResult}` : ""
          }`
        );
      } else {
        // Para endereços DIVERGENTES ou ainda não confirmados, preserva estritamente o endereço original digitado
        lines.push(`📍 *Endereço:* ${addressToUse}`);
      }
    }

    if (meetingPoint.trim()) {
      lines.push(`🤝 *Ponto de encontro:* ${meetingPoint.trim()}`);
    }

    // Apenas inclui estação de transporte e rota de caminhada se o endereço estiver estritamente CONFIRMADO
    if (isConfirmed && includeStationInMsg && selectedStation) {
      const stLine = buildStationLineForMessage(selectedStation);
      lastStationLineRef.current = stLine;
      lines.push(stLine);
    } else {
      lastStationLineRef.current = null;
    }

    if (includeRouteLinkInMsg) {
      const routeLink =
        customMapsUrl.trim() ||
        (isConfirmed && includeStationInMsg && selectedStation
          ? selectedStation.walkingRouteMapsUrl
          : isConfirmed && locateResult?.location?.googleMapsUrl
          ? locateResult.location.googleMapsUrl
          : "");

      if (routeLink) {
        lines.push(`🗺️ *Rota no Google Maps:* ${routeLink}`);
      }
    }

    if (notes.trim()) {
      lines.push("");
      lines.push(`📝 *Orientações:* ${notes.trim()}`);
    }

    lines.push("");
    lines.push("Confirma presença? ✅");

    if (operatorName.trim()) {
      lines.push("");
      lines.push(`_${operatorName.trim()} — Rebuss_`);
    }

    return lines.join("\n");
  }, [
    scaleDate,
    scaleTime,
    storeName,
    addressInput,
    locateResult,
    meetingPoint,
    includeStationInMsg,
    selectedStation,
    includeRouteLinkInMsg,
    customMapsUrl,
    notes,
    operatorName,
  ]);

  // Synchronize message when fields change (preserving manual edits when possible)
  useEffect(() => {
    if (!isManuallyEdited) {
      setMessageText(buildAutomaticMessage());
    }
  }, [buildAutomaticMessage, isManuallyEdited]);

  // When station selection changes while manually edited, update the station line in-place
  const handleSelectStation = (station: TransitStationResult) => {
    setSelectedStationId(station.id);

    if (isManuallyEdited && includeStationInMsg) {
      const newStationLine = buildStationLineForMessage(station);
      const prevLine = lastStationLineRef.current;

      if (prevLine && messageText.includes(prevLine)) {
        let updated = messageText.replace(prevLine, newStationLine);
        if (!customMapsUrl.trim() && includeRouteLinkInMsg) {
          updated = updated.replace(
            /🗺️ \*Rota no Google Maps:\* https?:\/\/[^\s]+/,
            `🗺️ *Rota no Google Maps:* ${station.walkingRouteMapsUrl}`
          );
        }
        lastStationLineRef.current = newStationLine;
        setMessageText(updated);
      } else {
        lastStationLineRef.current = newStationLine;
      }
    }
  };

  // Perform location lookup
  const executeLocate = useCallback(
    async (
      rawAddress: string,
      options?: {
        selectedCandidate?: GeocodedCandidate;
        force?: boolean;
        forceConfirmed?: boolean;
      }
    ) => {
      const trimmed = rawAddress.trim();
      if (!trimmed) {
        setLocateError("Digite ou cole um endereço do Google Maps para localizar.");
        setLocateResult(null);
        setSelectedStationId(null);
        return;
      }

      if (trimmed.length < 4) {
        setLocateError(
          "Endereço muito curto. Informe logradouro, bairro ou cidade (ex: Av. Paulista, Bela Vista, São Paulo - SP)."
        );
        setLocateResult(null);
        setSelectedStationId(null);
        return;
      }

      const hint = CITY_HINTS[selectedHintIdx] || CITY_HINTS[0];
      const requestKey = `${trimmed.toLowerCase()}|${hint.city}|${hint.state}|${
        options?.selectedCandidate?.lat ?? ""
      },${options?.selectedCandidate?.lon ?? ""}|force=${options?.forceConfirmed ? "1" : "0"}`;

      if (!options?.force && requestKey === lastSearchedKeyRef.current && locateResult) {
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLocating(true);
      setLocateError(null);

      try {
        const res = await scaleGeneratorApi.locateAddress(
          {
            input: trimmed,
            cityHint: hint.city || undefined,
            stateHint: hint.state || undefined,
            selectedLat: options?.selectedCandidate?.lat,
            selectedLon: options?.selectedCandidate?.lon,
            selectedDisplayName: options?.selectedCandidate?.displayName,
            forceConfirmed: options?.forceConfirmed,
          },
          controller.signal
        );

        lastSearchedKeyRef.current = requestKey;
        setLocateResult(res);

        if (res.stations && res.stations.length > 0) {
          setSelectedStationId(res.stations[0].id);
        } else {
          setSelectedStationId(null);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        setLocateResult(null);
        setSelectedStationId(null);
        setLocateError(
          err.message ||
            "Não foi possível localizar o endereço informado. Verifique os dados e tente novamente."
        );
      } finally {
        if (abortControllerRef.current === controller) {
          setLocating(false);
        }
      }
    },
    [selectedHintIdx, locateResult]
  );

  // Trigger single debounced search on paste
  const handleAddressPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted || pasted.trim().length < 6) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      executeLocate(pasted, { force: true });
    }, 250);
  };

  const handleClearAddress = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    lastSearchedKeyRef.current = "";
    setAddressInput("");
    setLocateResult(null);
    setLocateError(null);
    setSelectedStationId(null);
  };

  const handleCopyMessage = async () => {
    const trimmedMsg = messageText.trim();
    if (!trimmedMsg) {
      toast.error("A mensagem está vazia. Preencha os dados da escala primeiro.");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(trimmedMsg);
      } else {
        const ta = document.createElement("textarea");
        ta.value = trimmedMsg;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2200);
      toast.success("Mensagem da escala copiada para a área de transferência!");

      // Save to history if store or address is filled
      if (storeName.trim() || addressInput.trim()) {
        const newItem: ScaleHistoryItem = {
          id: `scale-${Date.now()}`,
          store: storeName.trim() || "Operação Rebuss",
          date: scaleDate,
          time: scaleTime,
          addressInput: addressInput.trim(),
          resolvedAddress:
            locateResult?.location?.formattedAddress || addressInput.trim(),
          cityState:
            locateResult?.location?.city && locateResult?.location?.state
              ? `${locateResult.location.city}/${locateResult.location.state}`
              : "",
          stationName: selectedStation?.name || null,
          stationSummary: selectedStation
            ? `${selectedStation.transportLabel}: ${selectedStation.name} (${
                selectedStation.routeVerified &&
                selectedStation.walkingDistanceMeters !== null
                  ? `${formatDistance(selectedStation.walkingDistanceMeters)} a pé`
                  : `${formatDistance(selectedStation.straightDistanceMeters)} linha reta`
              })`
            : null,
          message: trimmedMsg,
          createdAt: new Date().toISOString(),
        };

        const filtered = history.filter(
          (h) =>
            !(
              h.store === newItem.store &&
              h.date === newItem.date &&
              h.time === newItem.time &&
              h.addressInput === newItem.addressInput
            )
        );
        persistHistory([newItem, ...filtered].slice(0, 30));
      }
    } catch {
      toast.error("Não foi possível copiar a mensagem automaticamente.");
    }
  };

  const handleAppendQuickNote = (noteText: string) => {
    const cleanNote = noteText.trim();
    // Identifica o texto base sem pontuação final para evitar duplicidades
    const baseSearch = cleanNote.replace(/[.!?]+$/, "").trim();
    if (new RegExp(baseSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(notes)) {
      if (notesTextareaRef.current) {
        notesTextareaRef.current.focus();
      }
      return;
    }

    setNotes((prev) => {
      const trimmed = prev.trim();
      const textToAppend = cleanNote.endsWith(".") ? cleanNote : `${cleanNote}.`;
      if (!trimmed) return textToAppend;
      const endsWithPunctuation = /[.!?]$/.test(trimmed);
      return `${trimmed}${endsWithPunctuation ? " " : ". "}${textToAppend}`;
    });
  };

  const handleAppendBonus = () => {
    // Evita duplicar orientação de bônus
    if (/b[ôo]nus\s+r\$/i.test(notes)) {
      if (notesTextareaRef.current) {
        notesTextareaRef.current.focus();
      }
      return;
    }

    const bonusPrefix = "Bônus R$ ";
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return bonusPrefix;
      const endsWithPunctuation = /[.!?]$/.test(trimmed);
      return `${trimmed}${endsWithPunctuation ? " " : ". "}${bonusPrefix}`;
    });

    // Foca o campo imediatamente após "Bônus R$ " para digitação ágil do valor
    setTimeout(() => {
      if (notesTextareaRef.current) {
        notesTextareaRef.current.focus();
        const len = notesTextareaRef.current.value.length;
        notesTextareaRef.current.setSelectionRange(len, len);
      }
    }, 40);
  };

  const handleLoadFromHistory = (item: ScaleHistoryItem) => {
    setStoreName(item.store);
    setScaleDate(item.date);
    setScaleTime(item.time);
    setAddressInput(item.addressInput);
    setMessageText(item.message);
    setIsManuallyEdited(true);
    if (item.addressInput.trim().length >= 6) {
      executeLocate(item.addressInput, { force: true });
    }
    toast.info(`Escala "${item.store}" carregada no painel.`);
  };

  const handleDeleteHistoryItem = (id: string) => {
    persistHistory(history.filter((h) => h.id !== id));
    toast.info("Registro removido do histórico.");
  };

  const handleClearHistory = () => {
    persistHistory([]);
    toast.info("Histórico de escalas limpo.");
  };

  return (
    <ErrorBoundary fallbackTitle="Ocorreu uma instabilidade no Gerador de Escalas">
      <div className="space-y-6">
      {/* Editorial Masthead */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-5">
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            MÓDULO 03 · LOGÍSTICA & DESPACHO
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Gerador de Escalas
            </h1>
            <Badge variant="secondary" className="font-mono text-[10px]">
              GEOCODIFICAÇÃO & ROTAS A PÉ
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Informe o endereço completo do Google Maps para localizar estações de metrô, trem e terminais próximos e compor o comunicado da operação.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStoreName("");
              setMeetingPoint("");
              setCustomMapsUrl("");
              setNotes("");
              setIsManuallyEdited(false);
              handleClearAddress();
            }}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpar Campos</span>
          </Button>
        </div>
      </div>

      {/* Main 12-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Step 1 (Location & Transit) & Step 2 (Scale Data) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ETAPA 1 — LOCALIZAÇÃO E TRANSPORTE PÚBLICO */}
          <Card className="border-border">
            <CardHeader className="pb-3.5 border-b border-border bg-muted/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-5 items-center justify-center rounded border border-primary/30 bg-primary/10 px-1.5 font-mono text-[11px] font-semibold text-primary">
                    01
                  </span>
                  <CardTitle className="text-sm font-semibold">
                    Localização e Transporte Público Próximo
                  </CardTitle>
                </div>

                {/* Optional City/State Hint Selector */}
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="city-hint-select"
                    className="text-[11px] text-muted-foreground hidden sm:inline"
                  >
                    Região padrão:
                  </label>
                  <select
                    id="city-hint-select"
                    value={selectedHintIdx}
                    onChange={(e) => setSelectedHintIdx(Number(e.target.value))}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {CITY_HINTS.map((h, idx) => (
                      <option key={h.label} value={idx}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <CardDescription className="text-xs">
                Cole o endereço completo exatamente como fornecido pelo Google Maps (qualquer cidade ou estado do Brasil).
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Primary Google Maps Address Input */}
              <div className="space-y-2">
                <label
                  htmlFor="scale-address-input"
                  className="block text-xs font-medium text-foreground/90 uppercase tracking-wider"
                >
                  Endereço Completo ou Link do Google Maps
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="scale-address-input"
                      type="text"
                      value={addressInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddressInput(val);
                        if (locateError) setLocateError(null);
                        // Invalida resultados e estações anteriores quando o endereço é alterado
                        if (locateResult) {
                          setLocateResult(null);
                          setSelectedStationId(null);
                          lastSearchedKeyRef.current = "";
                        }
                      }}
                      onPaste={handleAddressPaste}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          executeLocate(addressInput, { force: true });
                        }
                      }}
                      placeholder="Ex: St. Sudoeste Comércio Local Sudoeste 6 - Sudoeste, Brasília - DF, 70680-650"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    {addressInput && (
                      <button
                        type="button"
                        onClick={handleClearAddress}
                        title="Limpar endereço"
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => executeLocate(addressInput, { force: true })}
                    isLoading={locating}
                    className="gap-1.5 shrink-0"
                  >
                    <Search className="h-4 w-4" />
                    <span>Localizar</span>
                  </Button>
                </div>
              </div>

              {/* Loading Skeleton */}
              {locating && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-primary font-medium">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>
                      Geocodificando endereço e pesquisando estações/terminais próximos e rotas a pé...
                    </span>
                  </div>
                  <div className="h-2 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              )}

              {/* Error State */}
              {!locating && locateError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Não foi possível confirmar a localização</span>
                  </div>
                  <p className="text-destructive/90 leading-relaxed">{locateError}</p>
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Você pode continuar preenchendo as demais informações e gerar a mensagem da escala normalmente.
                  </p>
                </div>
              )}

              {/* Geocoded Destination Verification Box */}
              {!locating && locateResult && (
                <div className="space-y-4">
                  {/* CASO 1: DIVERGENTE */}
                  {locateResult.status === "DIVERGENTE" && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                          <span>Atenção: Divergência de Localização Detectada</span>
                          <Badge variant="warning" className="text-[10px]">
                            DIVERGENTE
                          </Badge>
                        </div>

                        {locateResult.location?.googleMapsUrl && (
                          <a
                            href={locateResult.location.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 hover:underline shrink-0"
                          >
                            <span>Conferir no Google Maps</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                        {locateResult.divergence?.summary ||
                          "O endereço digitado difere do resultado retornado pelo serviço de geocodificação."}
                      </p>

                      {/* Comparativo: Solicitado vs Localizado */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                        <div className="rounded-md border border-border/70 bg-background/80 p-2.5 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Endereço Solicitado
                          </span>
                          <p className="text-foreground font-medium">
                            {locateResult.parsedInput?.originalInput || addressInput}
                          </p>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                            <span>
                              Município:{" "}
                              <strong className="text-foreground">
                                {locateResult.divergence?.requestedCity ||
                                  locateResult.parsedInput?.municipio ||
                                  locateResult.parsedInput?.city ||
                                  "Não detectado"}
                              </strong>
                            </span>
                            <span>
                              UF:{" "}
                              <strong className="text-foreground">
                                {locateResult.divergence?.requestedState ||
                                  locateResult.parsedInput?.uf ||
                                  locateResult.parsedInput?.state ||
                                  "-"}
                              </strong>
                            </span>
                            {locateResult.parsedInput?.numero && (
                              <span>
                                Nº:{" "}
                                <strong className="text-foreground">
                                  {locateResult.parsedInput.numero}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-400 block">
                            Localização Encontrada
                          </span>
                          <p className="text-foreground font-medium">
                            {locateResult.location?.formattedAddress || addressInput}
                          </p>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                            <span>
                              Município:{" "}
                              <strong className="text-amber-300">
                                {locateResult.divergence?.foundCity ||
                                  locateResult.location?.municipio ||
                                  locateResult.location?.city ||
                                  "Não identificado"}
                              </strong>
                            </span>
                            <span>
                              UF:{" "}
                              <strong className="text-amber-300">
                                {locateResult.divergence?.foundState ||
                                  locateResult.location?.uf ||
                                  locateResult.location?.state ||
                                  "-"}
                              </strong>
                            </span>
                            {locateResult.location?.numero && (
                              <span>
                                Nº:{" "}
                                <strong className="text-foreground">
                                  {locateResult.location.numero}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded border border-amber-500/20 bg-background/50 p-2 text-[11px] text-muted-foreground">
                        🛡️ <strong>Segurança Operacional:</strong> A pesquisa de estações de transporte e o trajeto a pé foram pausados para evitar enviar colaboradores para municípios incorretos. A mensagem gerada utilizará o endereço original digitado.
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            executeLocate(addressInput, {
                              force: true,
                              forceConfirmed: true,
                            })
                          }
                          className="text-xs border-amber-500/50 hover:bg-amber-500/10 text-amber-300 gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Confirmar e Usar Este Endereço Mesmo Assim</span>
                        </Button>

                        <span className="text-[11px] text-muted-foreground">
                          ou edite o campo acima ajustando rua, número e cidade.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CASO 2: NAO_LOCALIZADO */}
                  {locateResult.status === "NAO_LOCALIZADO" && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-2 text-xs text-rose-300">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        <span>Endereço Não Localizado com Segurança</span>
                        <Badge variant="destructive" className="text-[10px]">
                          NÃO LOCALIZADO
                        </Badge>
                      </div>
                      <p className="text-foreground/90 leading-relaxed">
                        {locateResult.divergence?.summary ||
                          "Não encontramos correspondência exata para este endereço nos serviços de mapas."}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Dica: Verifique se o nome da rua, número e município estão preenchidos, ou cole diretamente o link compartilhado do Google Maps.
                      </p>
                    </div>
                  )}

                  {/* CASO 3: CONFIRMADO */}
                  {locateResult.status === "CONFIRMADO" && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Endereço Interpretado e Confirmado</span>
                            <Badge variant="success" className="text-[10px] ml-1">
                              CONFIRMADO
                            </Badge>
                            <Badge
                              variant={
                                locateResult.location?.precision === "exact" ||
                                locateResult.location?.precision === "street"
                                  ? "success"
                                  : "warning"
                              }
                              className="text-[10px] ml-1"
                            >
                              {locateResult.location?.precision === "exact"
                                ? "Ponto / Logradouro Exato"
                                : locateResult.location?.precision === "street"
                                ? "Logradouro Confirmado"
                                : "Referência de Setor / Bairro"}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-foreground mt-1">
                            {locateResult.location?.formattedAddress || addressInput}
                          </p>
                        </div>

                        {locateResult.location?.googleMapsUrl && (
                          <a
                            href={locateResult.location.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0"
                          >
                            <span>Conferir destino no Maps</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {/* Chips dos componentes separados */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                        {(locateResult.location?.logradouro ||
                          locateResult.location?.street ||
                          locateResult.parsedInput?.logradouro) && (
                          <span className="rounded bg-background/80 border border-border/60 px-2 py-0.5">
                            Logradouro:{" "}
                            <strong>
                              {locateResult.location?.logradouro ||
                                locateResult.location?.street ||
                                locateResult.parsedInput?.logradouro}
                            </strong>
                          </span>
                        )}
                        {(locateResult.location?.numero ||
                          locateResult.location?.number ||
                          locateResult.parsedInput?.numero) && (
                          <span className="rounded bg-background/80 border border-border/60 px-2 py-0.5">
                            Nº:{" "}
                            <strong>
                              {locateResult.location?.numero ||
                                locateResult.location?.number ||
                                locateResult.parsedInput?.numero}
                            </strong>
                          </span>
                        )}
                        {(locateResult.location?.bairro ||
                          locateResult.location?.neighborhood ||
                          locateResult.parsedInput?.bairro) && (
                          <span className="rounded bg-background/80 border border-border/60 px-2 py-0.5">
                            Bairro:{" "}
                            <strong>
                              {locateResult.location?.bairro ||
                                locateResult.location?.neighborhood ||
                                locateResult.parsedInput?.bairro}
                            </strong>
                          </span>
                        )}
                        {(locateResult.location?.municipio ||
                          locateResult.location?.city ||
                          locateResult.parsedInput?.municipio) && (
                          <span className="rounded bg-background/80 border border-border/60 px-2 py-0.5">
                            Município:{" "}
                            <strong>
                              {locateResult.location?.municipio ||
                                locateResult.location?.city ||
                                locateResult.parsedInput?.municipio}
                              {(locateResult.location?.uf ||
                                locateResult.location?.state ||
                                locateResult.parsedInput?.uf)
                                ? ` - ${
                                    locateResult.location?.uf ||
                                    locateResult.location?.state ||
                                    locateResult.parsedInput?.uf
                                  }`
                                : ""}
                            </strong>
                          </span>
                        )}
                        {(locateResult.location?.cep ||
                          locateResult.location?.postalCode ||
                          locateResult.parsedInput?.cep) && (
                          <span className="rounded bg-background/80 border border-border/60 px-2 py-0.5">
                            CEP:{" "}
                            <strong>
                              {locateResult.location?.cep ||
                                locateResult.location?.postalCode ||
                                locateResult.parsedInput?.cep}
                            </strong>
                          </span>
                        )}
                        <span className="rounded bg-background/80 border border-border/60 px-2 py-0.5 font-mono text-[10px]">
                          {locateResult.location?.lat != null ? locateResult.location.lat.toFixed(5) : "—"},{" "}
                          {locateResult.location?.lon != null ? locateResult.location.lon.toFixed(5) : "—"}
                        </span>
                        {locateResult.location?.source && (
                          <span className="rounded bg-background/80 border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                            Fonte: {locateResult.location.source}
                          </span>
                        )}
                      </div>

                      {locateResult.location?.confidenceNote && (
                        <p className="text-[11px] text-amber-400/90">
                          Nota: {locateResult.location.confidenceNote}
                        </p>
                      )}

                      {/* Seletor de alternativas */}
                      {locateResult.candidates && locateResult.candidates.length > 1 && (
                        <div className="pt-2 border-t border-border/50 space-y-1.5">
                          <span className="text-[11px] text-muted-foreground block">
                            Outras correspondências encontradas (clique caso queira ajustar o ponto exato):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {locateResult.candidates.map((cand) => {
                              const isCurrent =
                                locateResult.location &&
                                Math.abs(cand.lat - locateResult.location.lat) < 0.0001 &&
                                Math.abs(cand.lon - locateResult.location.lon) < 0.0001;
                              return (
                                <button
                                  key={cand.id}
                                  type="button"
                                  onClick={() =>
                                    executeLocate(addressInput, {
                                      selectedCandidate: cand,
                                      force: true,
                                    })
                                  }
                                  className={`text-left text-[11px] px-2.5 py-1 rounded border transition-colors ${
                                    isCurrent
                                      ? "border-primary bg-primary/15 text-foreground font-medium"
                                      : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:border-border"
                                  }`}
                                >
                                  {cand.formattedAddress}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção de Estações e Terminais Próximos (Apenas visível quando CONFIRMADO) */}
                  {locateResult.status === "CONFIRMADO" && (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                            Estações e Terminais Próximos ({locateResult.stations?.length ?? 0})
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            Raio pesquisado: {(((locateResult.stationSearchMeta?.radiusMetersUsed ?? 3500)) / 1000).toFixed(0)} km
                          </span>
                        </div>

                        <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={includeStationInMsg}
                            onChange={(e) => setIncludeStationInMsg(e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span className="text-muted-foreground">
                            Incluir estação selecionada na mensagem
                          </span>
                        </label>
                      </div>

                      {locateResult.stationSearchMeta?.message && (
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                          {locateResult.stationSearchMeta.message}
                        </div>
                      )}

                      {(locateResult.stations?.length ?? 0) === 0 ? (
                        <div className="rounded-lg border border-border/60 bg-muted/15 p-4 text-center text-xs text-muted-foreground">
                          Nenhuma estação de metrô, trem ou terminal de ônibus foi encontrado próximo a este endereço. A mensagem será gerada apenas com o endereço e link direto do local.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(locateResult.stations || []).map((st, idx) => {
                            const isSelected = st.id === selectedStationId;
                            return (
                              <div
                                key={st.id}
                                onClick={() => handleSelectStation(st)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleSelectStation(st);
                                  }
                                }}
                                className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border/70 bg-card/60 hover:border-border hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-start gap-2.5">
                                    <div
                                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                                        isSelected
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-border bg-muted/50 text-muted-foreground"
                                      }`}
                                    >
                                      {st.transportType === "TERMINAL_ONIBUS" ? (
                                        <Bus className="h-3.5 w-3.5" />
                                      ) : (
                                        <Train className="h-3.5 w-3.5" />
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-semibold text-foreground">
                                          {st.name}
                                        </span>
                                        <Badge
                                          variant={isSelected ? "default" : "secondary"}
                                          className="text-[10px]"
                                        >
                                          {st.transportLabel}
                                        </Badge>
                                        {st.line && (
                                          <Badge variant="outline" className="text-[10px]">
                                            Linha {st.line}
                                          </Badge>
                                        )}
                                        {idx === 0 && (
                                          <span className="text-[10px] font-medium text-emerald-400">
                                            • Mais próxima
                                          </span>
                                        )}
                                      </div>

                                      {/* Clear differentiation between Walking Route vs Straight-Line Distance */}
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                          <Compass className="h-3 w-3 text-muted-foreground" />
                                          <span>
                                            Linha reta:{" "}
                                            <strong className="text-foreground/90">
                                              {formatDistance(st.straightDistanceMeters)}
                                            </strong>
                                          </span>
                                        </span>

                                        {st.routeVerified &&
                                        st.walkingDistanceMeters !== null ? (
                                          <>
                                            <span className="inline-flex items-center gap-1 text-emerald-400">
                                              <Footprints className="h-3 w-3" />
                                              <span>
                                                Trajeto a pé:{" "}
                                                <strong>
                                                  {formatDistance(st.walkingDistanceMeters)}
                                                </strong>
                                              </span>
                                            </span>
                                            {st.walkingDurationMinutes !== null && (
                                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                                <Clock className="h-3 w-3" />
                                                <span>
                                                  Caminhada:{" "}
                                                  <strong>
                                                    ~{st.walkingDurationMinutes} min
                                                  </strong>
                                                </span>
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground/75 italic">
                                            (Trajeto a pé não verificado)
                                          </span>
                                        )}
                                      </div>

                                      {(st.address || st.operator) && (
                                        <p className="text-[11px] text-muted-foreground/80">
                                          {[st.address, st.operator]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Direct Google Maps Actions */}
                                  <div
                                    className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <a
                                      href={st.stationMapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Abrir localização da estação no Google Maps"
                                      className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                                    >
                                      <MapPin className="h-3 w-3" />
                                      <span>Local</span>
                                    </a>

                                    <a
                                      href={st.walkingRouteMapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Abrir rota a pé da estação até o destino no Google Maps"
                                      className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                                    >
                                      <Navigation className="h-3 w-3" />
                                      <span>Rota a pé</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ETAPA 2 — DADOS OPERACIONAIS DA ESCALA */}
          <Card className="border-border">
            <CardHeader className="pb-3.5 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-5 items-center justify-center rounded border border-primary/30 bg-primary/10 px-1.5 font-mono text-[11px] font-semibold text-primary">
                  02
                </span>
                <CardTitle className="text-sm font-semibold">
                  Dados Operacionais da Escala
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Configure a loja, data, horário, ponto de encontro e orientações para a equipe.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Loja / Operação"
                  placeholder="Ex: Carrefour Pamplona, GPA, Assaí..."
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />

                <Input
                  label="Seu Nome (Assinatura)"
                  placeholder="Ex: Kelvi, Elaine, Danilo..."
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Data da Escala"
                  type="date"
                  value={scaleDate}
                  onChange={(e) => setScaleDate(e.target.value)}
                />

                <Input
                  label="Horário de Apresentação"
                  type="time"
                  value={scaleTime}
                  onChange={(e) => setScaleTime(e.target.value)}
                />

                <Input
                  label="Ponto de Encontro (Opcional)"
                  placeholder="Ex: Portaria de colaboradores"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="custom-maps-url"
                    className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Link de Rota / Chegada Personalizado (Opcional)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeRouteLinkInMsg}
                      onChange={(e) => setIncludeRouteLinkInMsg(e.target.checked)}
                      className="rounded border-border text-primary h-3.5 w-3.5"
                    />
                    <span>Incluir link do Maps na mensagem</span>
                  </label>
                </div>
                <input
                  id="custom-maps-url"
                  type="url"
                  value={customMapsUrl}
                  onChange={(e) => setCustomMapsUrl(e.target.value)}
                  placeholder="Se deixar em branco, usará automaticamente o link da rota verificada do Google Maps"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="scale-notes"
                  className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Orientações Operacionais / Observações (Opcional)
                </label>
                <textarea
                  id="scale-notes"
                  ref={notesTextareaRef}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Traje camiseta preta e calça jeans. Apresentar documento original com foto na portaria."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-1 focus-visible:ring-primary/30 resize-y"
                />

                {/* Quick Note Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-muted-foreground mr-1">
                    Inserir orientação rápida:
                  </span>
                  {QUICK_NOTES.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => handleAppendQuickNote(qn)}
                      className="text-[10px] rounded border border-border bg-muted/40 hover:bg-muted px-2 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      + {qn}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAppendQuickNote("Levar alimentação")}
                    className="text-[10px] rounded border border-border bg-muted/40 hover:bg-muted px-2 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Levar alimentação
                  </button>
                  <button
                    type="button"
                    onClick={handleAppendBonus}
                    className="text-[10px] rounded border border-border bg-muted/40 hover:bg-muted px-2 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Bônus R$
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (5 cols): Step 3 (Editable Message Preview & History) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          {/* ETAPA 3 — MENSAGEM FINAL EDITÁVEL */}
          <Card className="border-border">
            <CardHeader className="pb-3.5 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-5 items-center justify-center rounded border border-primary/30 bg-primary/10 px-1.5 font-mono text-[11px] font-semibold text-primary">
                    03
                  </span>
                  <CardTitle className="text-sm font-semibold">
                    Mensagem Final (Prévia Editável)
                  </CardTitle>
                </div>

                {isManuallyEdited ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManuallyEdited(false);
                      setMessageText(buildAutomaticMessage());
                      toast.info("Prévia sincronizada novamente com os campos do formulário.");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:underline"
                    title="Descartar edições manuais e regerar pelos campos"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restaurar automático</span>
                  </button>
                ) : (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    AUTO-SYNC
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Revise ou edite livremente o texto abaixo antes de copiar para enviar à equipe.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <textarea
                id="scale-message-preview"
                rows={13}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  setIsManuallyEdited(true);
                }}
                aria-label="Prévia editável da mensagem de escala"
                className="flex w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-1 focus-visible:ring-primary/30 resize-y"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleCopyMessage}
                  className="flex-1 gap-2 font-semibold"
                >
                  {copiedPreview ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Mensagem Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar Mensagem</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsManuallyEdited(false);
                    setMessageText(buildAutomaticMessage());
                    toast.success("Mensagem atualizada com base nos campos da escala.");
                  }}
                  title="Atualizar mensagem com base nos campos"
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Atualizar</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* HISTÓRICO DE ESCALAS RECENTES */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold">
                    Histórico Recente ({history.length})
                  </CardTitle>
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Limpar histórico
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-3">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  As escalas copiadas ficarão salvas aqui para reutilização rápida.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-border/60 bg-muted/15 p-2.5 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {item.store}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {formatDateBr(item.date)} · {item.time}
                        </span>
                      </div>

                      {item.resolvedAddress && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          📍 {item.resolvedAddress}
                        </p>
                      )}

                      {item.stationSummary && (
                        <p className="text-[11px] text-primary/90 truncate">
                          🚇 {item.stationSummary}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(item.message);
                            toast.success("Mensagem do histórico copiada!");
                          }}
                          className="rounded border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Copiar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadFromHistory(item)}
                          className="rounded border border-border/70 bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Carregar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-destructive"
                          title="Excluir do histórico"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </ErrorBoundary>
);
};
