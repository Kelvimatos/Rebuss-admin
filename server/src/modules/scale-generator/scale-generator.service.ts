import { LocateAddressInput } from "./scale-generator.schemas.js";
import { REGISTERED_TRANSIT_STATIONS } from "./transit-stations.data.js";

export type AddressValidationStatus = "CONFIRMADO" | "DIVERGENTE" | "NAO_LOCALIZADO";

export interface AddressDivergence {
  hasDivergence: boolean;
  type?: "CITY_MISMATCH" | "STATE_MISMATCH" | "NUMBER_MISMATCH" | "CEP_MISMATCH" | "MULTIPLE";
  requestedCity?: string;
  foundCity?: string;
  requestedState?: string;
  foundState?: string;
  requestedNumber?: string;
  foundNumber?: string;
  requestedCep?: string;
  foundCep?: string;
  summary: string;
}

export interface ParsedAddressComponents {
  originalInput: string;
  normalizedInput: string;
  isUrl: boolean;
  establishment?: string | null;
  street?: string | null;
  logradouro?: string | null;
  number?: string | null;
  numero?: string | null;
  complemento?: string | null;
  neighborhood?: string | null;
  bairro?: string | null;
  city?: string | null;
  municipio?: string | null;
  state?: string | null;
  uf?: string | null;
  postalCode?: string | null;
  cep?: string | null;
  extractedCoords?: { lat: number; lon: number } | null;
}

export interface GeocodedCandidate {
  id: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lon: number;
  logradouro?: string | null;
  street?: string | null;
  numero?: string | null;
  number?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  neighborhood?: string | null;
  municipio?: string | null;
  city?: string | null;
  uf?: string | null;
  state?: string | null;
  cep?: string | null;
  postalCode?: string | null;
  precision: "exact" | "street" | "neighborhood" | "city";
  confidenceNote?: string | null;
  googleMapsUrl: string;
  placeId?: string | null;
  source: "google" | "nominatim" | "photon" | "viacep_coords" | "url_coords";
  validationStatus: AddressValidationStatus;
  divergence?: AddressDivergence | null;
  score?: number;
}

export interface TransitStationResult {
  id: string;
  name: string;
  transportType: "METRO" | "TREM" | "TERMINAL_ONIBUS" | "ESTACAO_INTEGRADA";
  transportLabel: string;
  line?: string | null;
  operator?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  lat: number;
  lon: number;
  straightDistanceMeters: number;
  walkingDistanceMeters: number | null;
  walkingDurationMinutes: number | null;
  routeVerified: boolean;
  stationMapsUrl: string;
  walkingRouteMapsUrl: string;
}

export interface LocateResponse {
  success: boolean;
  status: AddressValidationStatus;
  parsedInput: ParsedAddressComponents;
  location: GeocodedCandidate;
  candidates: GeocodedCandidate[];
  stations: TransitStationResult[];
  divergence?: AddressDivergence | null;
  stationSearchMeta: {
    radiusMetersUsed: number;
    totalFound: number;
    walkingRoutesResolved: boolean;
    message?: string | null;
  };
}

const BR_STATES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const STATE_NAME_TO_UF: Record<string, string> = Object.entries(BR_STATES).reduce(
  (acc, [uf, name]) => {
    acc[name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = uf;
    acc[uf.toLowerCase()] = uf;
    return acc;
  },
  {} as Record<string, string>
);

// TTL Cache to avoid redundant network roundtrips
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const geocodeCache = new Map<string, CacheEntry<LocateResponse>>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function normalizeKey(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 7000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Queue for Nominatim to respect 1 req/sec guidelines
let lastNominatimCallAt = 0;
let nominatimQueue: Promise<unknown> = Promise.resolve();

async function fetchNominatim(url: string, timeoutMs = 6500): Promise<Response> {
  const execute = async (): Promise<Response> => {
    const now = Date.now();
    const elapsed = now - lastNominatimCallAt;
    if (elapsed < 1100) {
      await new Promise((r) => setTimeout(r, 1100 - elapsed));
    }
    lastNominatimCallAt = Date.now();
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "RebussOps/2.0 (sistema-operacional-rebuss)",
          "Accept-Language": "pt-BR",
        },
      },
      timeoutMs
    );
    if (res.status === 429 || res.status === 503) {
      await new Promise((r) => setTimeout(r, 1500));
      lastNominatimCallAt = Date.now();
      return fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": "RebussOps/2.0 (sistema-operacional-rebuss)",
            "Accept-Language": "pt-BR",
          },
        },
        timeoutMs
      );
    }
    return res;
  };

  const next = nominatimQueue.then(execute, execute);
  nominatimQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

export class ScaleGeneratorService {
  /**
   * 1. PARSE ADDRESS INPUT
   * Robust parser distinguishing logradouro, número, complemento, bairro, município, UF, CEP and Google Maps URLs
   */
  async parseAddressInput(rawInput: string): Promise<ParsedAddressComponents> {
    const originalInput = rawInput;
    let working = rawInput.trim().replace(/\s+/g, " ");

    const looksLikeUrl =
      /^https?:\/\//i.test(working) ||
      /^(www\.)?(google\.com(\.br)?\/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(
        working
      );

    if (looksLikeUrl) {
      return this.parseGoogleMapsUrl(originalInput, working);
    }

    return this.extractTextComponents(originalInput, working);
  }

  /**
   * Safe parser for Google Maps URLs with SSRF protection
   */
  private async parseGoogleMapsUrl(
    originalInput: string,
    rawUrl: string
  ): Promise<ParsedAddressComponents> {
    let urlToInspect = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlToInspect);
    } catch {
      const err = new Error(
        "A URL informada possui formato inválido. Cole o endereço textual completo do Google Maps."
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // SSRF Whitelist protection: only allow official Google Maps hosts
    const host = parsedUrl.hostname.toLowerCase();
    const isAllowedHost =
      host === "maps.google.com" ||
      host === "www.google.com" ||
      host === "google.com" ||
      host === "maps.google.com.br" ||
      host === "www.google.com.br" ||
      host === "google.com.br" ||
      host === "goo.gl" ||
      host === "maps.app.goo.gl";

    if (!isAllowedHost) {
      const err = new Error(
        "A URL informada não pertence ao Google Maps. Por favor, cole um endereço textual brasileiro ou um link válido do Google Maps."
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // If shortened URL, safely follow redirect to unshorten
    if (host === "goo.gl" || host === "maps.app.goo.gl") {
      try {
        const res = await fetchWithTimeout(
          urlToInspect,
          {
            method: "GET",
            redirect: "follow",
            headers: { "User-Agent": "RebussOps/2.0" },
          },
          5000
        );
        if (res.url && res.url !== urlToInspect) {
          const redirectHost = new URL(res.url).hostname.toLowerCase();
          const isAllowedRedirect =
            redirectHost === "maps.google.com" ||
            redirectHost === "www.google.com" ||
            redirectHost === "google.com" ||
            redirectHost === "maps.google.com.br" ||
            redirectHost === "www.google.com.br" ||
            redirectHost === "google.com.br" ||
            redirectHost === "goo.gl" ||
            redirectHost === "maps.app.goo.gl" ||
            redirectHost.endsWith(".google.com") ||
            redirectHost.endsWith(".google.com.br");

          if (isAllowedRedirect) {
            urlToInspect = res.url;
          }
        }
      } catch {
        // Continue with original URL
      }
    }

    // Extract coordinates from !3dLAT!4dLON or @LAT,LON or ?q=LAT,LON or destination=LAT,LON
    let extractedCoords: { lat: number; lon: number } | null = null;
    const pinMatch = urlToInspect.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const atMatch = urlToInspect.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qCoordMatch = urlToInspect.match(
      /[?&](?:q|query|ll|destination|daddr)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/i
    );

    if (pinMatch) {
      extractedCoords = { lat: parseFloat(pinMatch[1]), lon: parseFloat(pinMatch[2]) };
    } else if (qCoordMatch) {
      extractedCoords = {
        lat: parseFloat(qCoordMatch[1]),
        lon: parseFloat(qCoordMatch[2]),
      };
    } else if (atMatch) {
      extractedCoords = { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[2]) };
    }

    // Extract place name / search text from URL
    let extractedPlaceText = "";
    const placeMatch = urlToInspect.match(/\/maps\/place\/([^/@?]+)/i);
    const searchMatch = urlToInspect.match(/\/maps\/search\/([^/@?]+)/i);
    const dirMatch = urlToInspect.match(/\/maps\/dir\/[^/]*\/([^/@?]+)/i);
    const queryParamMatch = urlToInspect.match(/[?&](?:q|query|destination|daddr)=([^&]+)/i);

    if (placeMatch && placeMatch[1]) {
      extractedPlaceText = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    } else if (searchMatch && searchMatch[1]) {
      extractedPlaceText = decodeURIComponent(searchMatch[1].replace(/\+/g, " "));
    } else if (dirMatch && dirMatch[1]) {
      extractedPlaceText = decodeURIComponent(dirMatch[1].replace(/\+/g, " "));
    } else if (queryParamMatch && queryParamMatch[1] && !qCoordMatch) {
      extractedPlaceText = decodeURIComponent(queryParamMatch[1].replace(/\+/g, " "));
    }

    if (!extractedCoords && !extractedPlaceText.trim()) {
      const err = new Error(
        "Não foi possível extrair coordenadas ou endereço deste link compartilhado do Google Maps. Por favor, copie e cole o endereço textual completo (ex: Rua, número, bairro, cidade - UF)."
      );
      (err as any).statusCode = 422;
      throw err;
    }

    if (extractedPlaceText.trim()) {
      const parsedText = this.extractTextComponents(originalInput, extractedPlaceText.trim());
      return {
        ...parsedText,
        isUrl: true,
        extractedCoords,
      };
    }

    return {
      originalInput,
      normalizedInput: `${extractedCoords!.lat}, ${extractedCoords!.lon}`,
      isUrl: true,
      extractedCoords,
    };
  }

  /**
   * Component extractor: properly separates logradouro, número, complemento, bairro, município, UF e CEP
   */
  private extractTextComponents(
    originalInput: string,
    workingInput: string
  ): ParsedAddressComponents {
    let working = workingInput
      .replace(/[\r\n\t]+/g, ", ")
      .replace(/\bEstr\.\s*/gi, "Estrada ")
      .replace(/\bAv\.\s*/gi, "Avenida ")
      .replace(/\bR\.\s*/gi, "Rua ")
      .replace(/\bAl\.\s*/gi, "Alameda ")
      .replace(/\bRod\.\s*/gi, "Rodovia ")
      .replace(/\bPça\.\s*/gi, "Praça ")
      .replace(/\bTrav\.\s*/gi, "Travessa ")
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*,+/g, ", ")
      .trim();

    // Remove trailing country
    working = working.replace(/,\s*(Brasil|Brazil)\s*$/i, "").trim();

    // 1. CEP Extraction (8 digits, with or without dash)
    let postalCode: string | null = null;
    const cepMatch = working.match(/\b(\d{5})\s*-?\s*(\d{3})\b/);
    if (cepMatch) {
      postalCode = `${cepMatch[1]}-${cepMatch[2]}`;
      working = working
        .replace(cepMatch[0], "")
        .replace(/,\s*$/, "")
        .replace(/-\s*$/, "")
        .trim();
    }

    // 2. UF and Município Extraction
    // Formats:
    // "... , Cidade - UF"
    // "... - Cidade - UF"
    // "... , Cidade, UF"
    // "... / UF"
    let state: string | null = null;
    let city: string | null = null;

    const cityStateRegex = /(?:,\s*|\s+-\s+)([^,-]+?)\s*(?:-|\/|\s+–\s+)\s*([A-Za-z]{2})\s*$/;
    const cityStateMatch = working.match(cityStateRegex);

    if (cityStateMatch) {
      const candidateUf = cityStateMatch[2].toUpperCase();
      if (BR_STATES[candidateUf]) {
        city = cityStateMatch[1].trim();
        state = candidateUf;
        working = working.slice(0, cityStateMatch.index).trim();
      }
    } else {
      const commaCityStateMatch = working.match(/,\s*([^,]+?)\s*,\s*([A-Za-z]{2})\s*$/);
      if (commaCityStateMatch) {
        const candidateUf = commaCityStateMatch[2].toUpperCase();
        if (BR_STATES[candidateUf]) {
          city = commaCityStateMatch[1].trim();
          state = candidateUf;
          working = working.slice(0, commaCityStateMatch.index).trim();
        }
      }
    }

    working = working.replace(/[,;\-–\s]+$/, "").trim();

    // 3. Bairro vs Complemento vs Logradouro Extraction
    let neighborhood: string | null = null;
    let complement: string | null = null;
    let streetPart = working;

    // Pattern: "Logradouro, Numero - Bairro" or "Logradouro, Numero - Complemento - Bairro"
    const dashTokens = working.split(/\s+[-–]\s+/);
    if (dashTokens.length >= 2) {
      const lastToken = dashTokens[dashTokens.length - 1].trim();
      if (/^(apto|apt|bloco|bl|sala|sl|andar|conj|cj|loja|lj|piso\s*t[eé]rreo|t[eé]rreo|subsolo|mezanino|galp[aã]o)\b/i.test(lastToken)) {
        complement = lastToken;
        streetPart = dashTokens.slice(0, -1).join(" - ").trim();
      } else {
        neighborhood = lastToken;
        if (dashTokens.length >= 3) {
          const middle = dashTokens[dashTokens.length - 2].trim();
          if (/^(apto|apt|bloco|bl|sala|sl|andar|conj|cj|loja|lj|piso\s*t[eé]rreo|t[eé]rreo|subsolo|mezanino|galp[aã]o)\b/i.test(middle)) {
            complement = middle;
            streetPart = dashTokens.slice(0, -2).join(" - ").trim();
          } else {
            streetPart = dashTokens.slice(0, -1).join(" - ").trim();
          }
        } else {
          streetPart = dashTokens.slice(0, -1).join(" - ").trim();
        }
      }
    }

    // 4. Separate Street, Number and Complement from streetPart
    let establishment: string | null = null;
    let street: string | null = null;
    let number: string | null = null;

    const roadPrefixRegex =
      /^(rua|r\.|avenida|av\.|alameda|al\.|praça|pç\.|pc\.|rodovia|rod\.|estrada|estr\.|travessa|tv\.|setor|st\.|quadra|qd\.|sqs|sqn|scln|scls|clsw|sqsw|ccsw|shis|shin|shcg|scn|shs|shn|epia|epgu|eptg|df-|sp-|rj-|br-|mg-|pr-)/i;

    const streetTokens = streetPart
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (
      streetTokens.length >= 2 &&
      !roadPrefixRegex.test(streetTokens[0]) &&
      roadPrefixRegex.test(streetTokens[1])
    ) {
      establishment = streetTokens[0];
      street = streetTokens[1];
      if (streetTokens.length >= 3) {
        number = streetTokens[2];
        if (streetTokens.length >= 4) {
          complement = complement || streetTokens.slice(3).join(", ");
        }
      }
    } else if (streetTokens.length >= 2) {
      street = streetTokens[0];
      const secondToken = streetTokens[1];
      const numMatch = secondToken.match(/^(\d+[A-Za-z0-9/-]*|s\/n|km\s*[\d.,]+)/i);
      if (numMatch) {
        number = numMatch[0];
        const rest = secondToken.slice(numMatch[0].length).replace(/^[\s,-]+/, "").trim();
        if (rest) {
          complement = complement || rest;
        }
        if (streetTokens.length >= 3) {
          const extra = streetTokens.slice(2).join(", ");
          complement = complement ? `${complement}, ${extra}` : extra;
        }
      } else {
        number = secondToken;
      }
    } else {
      street = streetPart;
      const inlineNumMatch = street.match(/^(.*?)\s+(\d+[A-Za-z]?)\s*$/);
      if (inlineNumMatch && !/^(quadra|bloco|lote|setor|st\.|qd\.)/i.test(street)) {
        street = inlineNumMatch[1].trim();
        number = inlineNumMatch[2].trim();
      }
    }

    const normalizedParts = [
      establishment,
      street,
      number,
      complement,
      neighborhood,
      city && state ? `${city} - ${state}` : city || state,
      postalCode,
    ].filter(Boolean);

    return {
      originalInput,
      normalizedInput: normalizedParts.join(", ") || workingInput.trim(),
      isUrl: false,
      establishment,
      street,
      logradouro: street,
      number,
      numero: number,
      complemento: complement,
      neighborhood,
      bairro: neighborhood,
      city,
      municipio: city,
      state,
      uf: state,
      postalCode,
      cep: postalCode,
      extractedCoords: null,
    };
  }

  /**
   * Expands common abbreviations for Brazilian cartographic standards
   */
  public expandBrazilianAbbreviations(text: string): string {
    if (!text) return "";
    return text
      .replace(/\bSt\.\s+Sudoeste\b/gi, "Setor Sudoeste")
      .replace(/\bSt\.\s+Noroeste\b/gi, "Setor Noroeste")
      .replace(/\bSt\.\s+/gi, "Setor ")
      .replace(/\bCom[ée]rcio\s+Local\s+Sudoeste\s+(\d+)\b/gi, "CLSW $1")
      .replace(/\bAv\.\s+/gi, "Avenida ")
      .replace(/\bR\.\s+/gi, "Rua ")
      .replace(/\bAl\.\s+/gi, "Alameda ")
      .replace(/\bP(?:ç|c)\.\s+/gi, "Praça ")
      .replace(/\bRod\.\s+/gi, "Rodovia ")
      .replace(/\bEstr\.\s+/gi, "Estrada ")
      .replace(/\bTv\.\s+/gi, "Travessa ")
      .replace(/\bJd\.\s+/gi, "Jardim ")
      .replace(/\bVl\.\s+/gi, "Vila ")
      .replace(/\bPq\.\s+/gi, "Parque ")
      .replace(/\bN(?:ossa|\.)?\s+Sra\.\s+/gi, "Nossa Senhora ")
      .replace(/\bPres\.\s+/gi, "Presidente ")
      .replace(/\bGov\.\s+/gi, "Governador ")
      .replace(/\bSen\.\s+/gi, "Senador ")
      .replace(/\bDep\.\s+/gi, "Deputado ")
      .replace(/\bDr\.\s+/gi, "Doutor ")
      .replace(/\bProf\.\s+/gi, "Professor ")
      .replace(/\bPe\.\s+/gi, "Padre ");
  }

  /**
   * 2. MAIN LOCATION RESOLVER & TRANSIT SEARCH
   */
  async locateAndFindTransit(payload: LocateAddressInput): Promise<LocateResponse> {
    const cacheKey = normalizeKey(
      `${payload.input}|${payload.cityHint || ""}|${payload.stateHint || ""}|${
        payload.selectedLat ?? ""
      },${payload.selectedLon ?? ""}|force=${payload.forceConfirmed ? "1" : "0"}`
    );

    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const parsed = await this.parseAddressInput(payload.input);

    // If city/state was not parsed directly from address string, use hints
    if (!parsed.city && payload.cityHint) {
      parsed.city = payload.cityHint;
      parsed.municipio = payload.cityHint;
    }
    if (!parsed.state && payload.stateHint) {
      parsed.state = payload.stateHint.toUpperCase();
      parsed.uf = payload.stateHint.toUpperCase();
    }

    // Minimum address length validation
    const cleanAlpha = parsed.originalInput.replace(/[^A-Za-zÀ-ÿ0-9]/g, "");
    if (cleanAlpha.length < 4 || /^(\d+|rua|avenida|av|centro|brasil)$/i.test(cleanAlpha)) {
      const err = new Error(
        "Endereço incompleto ou insuficiente para localização segura. Informe logradouro, bairro ou cidade (ex: Av. Paulista, Bela Vista, São Paulo - SP)."
      );
      (err as any).statusCode = 422;
      throw err;
    }

    let candidates: GeocodedCandidate[] = [];

    // Case A: User explicitly picked a candidate from ambiguity selector or forced confirmation
    if (
      typeof payload.selectedLat === "number" &&
      typeof payload.selectedLon === "number"
    ) {
      const selectedCandidate: GeocodedCandidate = {
        id: `selected-${payload.selectedLat}-${payload.selectedLon}`,
        displayName: payload.selectedDisplayName || parsed.normalizedInput,
        formattedAddress: payload.selectedDisplayName || parsed.normalizedInput,
        lat: payload.selectedLat,
        lon: payload.selectedLon,
        logradouro: parsed.street,
        street: parsed.street,
        numero: parsed.number,
        number: parsed.number,
        complemento: parsed.complemento,
        bairro: parsed.neighborhood,
        neighborhood: parsed.neighborhood,
        municipio: parsed.city,
        city: parsed.city,
        uf: parsed.state,
        state: parsed.state,
        cep: parsed.postalCode,
        postalCode: parsed.postalCode,
        precision: "exact",
        source: "url_coords",
        validationStatus: "CONFIRMADO",
        divergence: null,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${payload.selectedLat},${payload.selectedLon}`,
      };
      candidates = [selectedCandidate];
    } else if (parsed.extractedCoords) {
      const { lat, lon } = parsed.extractedCoords;
      const reverseCandidate = await this.reverseGeocode(lat, lon, parsed);
      candidates = [reverseCandidate];
    } else {
      // Step B: Multi-provider geocoding with strict evaluation
      candidates = await this.geocodeMultiProvider(parsed);
    }

    if (!candidates.length) {
      const err = new Error(
        "Não foi possível confirmar a localização geográfica deste endereço. Verifique a grafia ou tente informar rua, bairro e cidade."
      );
      (err as any).statusCode = 404;
      throw err;
    }

    // Determine primary candidate and overall validation status
    const primaryCandidate = candidates[0];
    const validationStatus = payload.forceConfirmed
      ? "CONFIRMADO"
      : primaryCandidate.validationStatus;

    if (payload.forceConfirmed) {
      primaryCandidate.validationStatus = "CONFIRMADO";
    }

    // Public transit stations are ONLY calculated when the address is CONFIRMED
    let transitStations: TransitStationResult[] = [];
    let transitMeta = {
      radiusMetersUsed: 0,
      totalFound: 0,
      walkingRoutesResolved: false,
      message: (null as string | null),
    };

    if (validationStatus === "CONFIRMADO") {
      const transitData = await this.findNearbyTransit(
        primaryCandidate.lat,
        primaryCandidate.lon
      );
      transitStations = transitData.stations;
      transitMeta = {
        radiusMetersUsed: transitData.radiusMetersUsed,
        totalFound: transitData.stations.length,
        walkingRoutesResolved: transitData.walkingRoutesResolved,
        message: transitData.message ?? null,
      };
    } else {
      transitMeta.message =
        "Cálculo de transporte público suspenso até que a divergência de endereço seja confirmada pelo usuário.";
    }

    const response: LocateResponse = {
      success: true,
      status: validationStatus,
      parsedInput: {
        ...parsed,
        street: parsed.street || primaryCandidate.street,
        logradouro: parsed.street || primaryCandidate.street,
        city: parsed.city || primaryCandidate.city,
        municipio: parsed.city || primaryCandidate.city,
        state: parsed.state || primaryCandidate.state,
        uf: parsed.state || primaryCandidate.state,
        neighborhood: parsed.neighborhood || primaryCandidate.neighborhood,
        bairro: parsed.neighborhood || primaryCandidate.neighborhood,
        postalCode: parsed.postalCode || primaryCandidate.postalCode,
        cep: parsed.postalCode || primaryCandidate.postalCode,
      },
      location: primaryCandidate,
      candidates,
      stations: transitStations,
      divergence: primaryCandidate.divergence || null,
      stationSearchMeta: transitMeta,
    };

    geocodeCache.set(cacheKey, {
      value: response,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return response;
  }

  /**
   * Multi-provider geocoding engine:
   * 1. Google Maps Platform (if GOOGLE_MAPS_API_KEY is configured)
   * 2. ViaCEP Official Brazilian Postal Enrichment
   * 3. Nominatim Structured Search (strictly bound to municipality and UF)
   * 4. Nominatim Freeform Search & Photon
   * 5. Strict comparison scoring
   */
  private async geocodeMultiProvider(
    parsed: ParsedAddressComponents
  ): Promise<GeocodedCandidate[]> {
    // Provider 1: Google Maps Platform (if key present)
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (googleApiKey && googleApiKey.trim().length > 10) {
      try {
        const googleCandidates = await this.queryGoogleMaps(parsed, googleApiKey.trim());
        if (googleCandidates.length > 0) {
          return this.rankAndClassifyCandidates(googleCandidates, parsed);
        }
      } catch (err) {
        console.warn("[ScaleGeneratorService] Falha ao consultar Google Maps API, usando fallback:", err);
      }
    }

    // Provider 2: ViaCEP Official Brazilian Postal Enrichment
    let viaCepData: {
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      complemento?: string;
    } | null = null;

    if (parsed.postalCode) {
      const cepDigits = parsed.postalCode.replace(/\D/g, "");
      if (cepDigits.length === 8) {
        try {
          const cepRes = await fetchWithTimeout(
            `https://viacep.com.br/ws/${cepDigits}/json/`,
            {},
            3500
          );
          if (cepRes.ok) {
            const json = (await cepRes.json()) as any;
            if (!json.erro) {
              viaCepData = json;
              // Official postal ground truth takes priority
              if (!parsed.city && json.localidade) {
                parsed.city = json.localidade;
                parsed.municipio = json.localidade;
              }
              if (!parsed.state && json.uf) {
                parsed.state = json.uf.toUpperCase();
                parsed.uf = json.uf.toUpperCase();
              }
              if (!parsed.neighborhood && json.bairro) {
                parsed.neighborhood = json.bairro;
                parsed.bairro = json.bairro;
              }
              if (!parsed.street && json.logradouro) {
                parsed.street = json.logradouro;
                parsed.logradouro = json.logradouro;
              }
            }
          }
        } catch {
          // Proceed with text parsing if ViaCEP is down
        }
      }
    }

    const allCandidates: GeocodedCandidate[] = [];

    // Step 2.1: Structured Search in Nominatim (restricts street within city & state)
    if (parsed.street && (parsed.city || viaCepData?.localidade)) {
      const cityToUse = parsed.city || viaCepData!.localidade!;
      const stateToUse = parsed.state || viaCepData?.uf || "SP";
      const streetToUse = this.expandBrazilianAbbreviations(
        viaCepData?.logradouro || parsed.street
      );

      const structuredCandidates = await this.queryNominatimStructured({
        street: streetToUse,
        city: cityToUse,
        state: stateToUse,
        postalCode: parsed.postalCode || undefined,
        parsed,
      });

      allCandidates.push(...structuredCandidates);
    }

    // Step 2.2: City-bounded Free-form Queries
    const queriesToTry: string[] = [];
    const targetCity = parsed.city || viaCepData?.localidade || "";
    const targetState = parsed.state || viaCepData?.uf || "";
    const streetBase = this.expandBrazilianAbbreviations(
      viaCepData?.logradouro || parsed.street || ""
    );

    if (streetBase && targetCity) {
      const numPart = parsed.number ? `, ${parsed.number}` : "";
      // Query without neighborhood first (in OSM, neighborhood names often differ from postal names)
      queriesToTry.push(`${streetBase}${numPart}, ${targetCity}, ${targetState}, Brasil`);
      queriesToTry.push(`${streetBase}, ${targetCity}, ${targetState}, Brasil`);

      if (parsed.neighborhood || viaCepData?.bairro) {
        const neigh = parsed.neighborhood || viaCepData!.bairro!;
        queriesToTry.push(`${streetBase}${numPart}, ${neigh}, ${targetCity}, ${targetState}, Brasil`);
      }
    } else {
      queriesToTry.push(`${parsed.normalizedInput}, Brasil`);
    }

    // Try Photon and Nominatim for the targeted queries
    for (const q of queriesToTry) {
      if (allCandidates.length >= 3) break;
      const photonResults = await this.queryPhoton(q, parsed);
      allCandidates.push(...photonResults);

      if (allCandidates.length === 0) {
        const nomResults = await this.queryNominatimFreeform(q, parsed);
        allCandidates.push(...nomResults);
      }
    }

    // If still no candidate, and we have a valid CEP from ViaCEP, try neighborhood reference as fallback
    if (allCandidates.length === 0 && (parsed.neighborhood || viaCepData?.bairro) && targetCity) {
      const neigh = parsed.neighborhood || viaCepData!.bairro!;
      const neighResults = await this.queryNominatimStructured({
        city: targetCity,
        state: targetState,
        postalCode: parsed.postalCode || undefined,
        parsed,
      });
      for (const cand of neighResults) {
        cand.precision = "neighborhood";
        cand.confidenceNote = `Logradouro exato não indexado; localização de referência no bairro ${neigh} (${targetCity} - ${targetState})`;
      }
      allCandidates.push(...neighResults);
    }

    return this.rankAndClassifyCandidates(allCandidates, parsed);
  }

  /**
   * Google Maps Platform Geocoding API integration
   */
  private async queryGoogleMaps(
    parsed: ParsedAddressComponents,
    apiKey: string
  ): Promise<GeocodedCandidate[]> {
    const query = parsed.normalizedInput;
    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query
    )}&key=${apiKey}&language=pt-BR`;

    const components: string[] = ["country:BR"];
    if (parsed.state) components.push(`administrative_area:${parsed.state}`);
    if (parsed.city) components.push(`locality:${parsed.city}`);
    if (parsed.postalCode) components.push(`postal_code:${parsed.postalCode.replace(/\D/g, "")}`);

    url += `&components=${encodeURIComponent(components.join("|"))}`;

    const res = await fetchWithTimeout(url, {}, 5000);
    if (!res.ok) return [];

    const data = (await res.json()) as any;
    if (data.status !== "OK" || !Array.isArray(data.results)) return [];

    const candidates: GeocodedCandidate[] = [];

    for (const r of data.results) {
      const lat = r.geometry?.location?.lat;
      const lon = r.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lon !== "number") continue;

      let street: string | null = null;
      let number: string | null = null;
      let neighborhood: string | null = null;
      let city: string | null = null;
      let state: string | null = null;
      let postalCode: string | null = null;

      for (const comp of r.address_components || []) {
        const types = comp.types || [];
        if (types.includes("route")) street = comp.long_name;
        if (types.includes("street_number")) number = comp.long_name;
        if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
          neighborhood = comp.long_name;
        }
        if (types.includes("administrative_area_level_2") || types.includes("locality")) {
          city = comp.long_name;
        }
        if (types.includes("administrative_area_level_1")) {
          state = comp.short_name;
        }
        if (types.includes("postal_code")) {
          postalCode = comp.long_name;
        }
      }

      const precision =
        r.geometry?.location_type === "ROOFTOP"
          ? "exact"
          : r.geometry?.location_type === "RANGE_INTERPOLATED"
          ? "exact"
          : typesMatch(r.types, ["route"])
          ? "street"
          : "neighborhood";

      candidates.push({
        id: `google-${r.place_id || `${lat}-${lon}`}`,
        displayName: r.formatted_address,
        formattedAddress: r.formatted_address,
        lat,
        lon,
        logradouro: street || parsed.street,
        street: street || parsed.street,
        numero: number || parsed.number,
        number: number || parsed.number,
        complemento: parsed.complemento,
        bairro: neighborhood || parsed.neighborhood,
        neighborhood: neighborhood || parsed.neighborhood,
        municipio: city || parsed.city,
        city: city || parsed.city,
        uf: state || parsed.state,
        state: state || parsed.state,
        cep: postalCode || parsed.postalCode,
        postalCode: postalCode || parsed.postalCode,
        precision,
        placeId: r.place_id,
        source: "google",
        validationStatus: "CONFIRMADO",
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      });
    }

    return candidates;
  }

  /**
   * Nominatim Structured Search
   * Guarantees strict municipal boundary constraint
   */
  private async queryNominatimStructured(params: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    parsed: ParsedAddressComponents;
  }): Promise<GeocodedCandidate[]> {
    try {
      const qParams = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        countrycodes: "br",
        limit: "5",
      });

      if (params.street) qParams.set("street", params.street);
      if (params.city) qParams.set("city", params.city);
      if (params.state) qParams.set("state", params.state);
      if (params.postalCode) qParams.set("postalcode", params.postalCode.replace(/\D/g, ""));

      const url = `https://nominatim.openstreetmap.org/search?${qParams.toString()}`;
      const res = await fetchNominatim(url, 6000);
      if (!res.ok) return [];

      const data = (await res.json()) as any[];
      if (!Array.isArray(data) || !data.length) return [];

      return this.mapNominatimItems(data, params.parsed);
    } catch {
      return [];
    }
  }

  /**
   * Nominatim Freeform Search
   */
  private async queryNominatimFreeform(
    query: string,
    parsed: ParsedAddressComponents
  ): Promise<GeocodedCandidate[]> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=jsonv2&addressdetails=1&countrycodes=br&limit=5`;

      const res = await fetchNominatim(url, 6000);
      if (!res.ok) return [];

      const data = (await res.json()) as any[];
      if (!Array.isArray(data) || !data.length) return [];

      return this.mapNominatimItems(data, parsed);
    } catch {
      return [];
    }
  }

  private mapNominatimItems(
    data: any[],
    parsed: ParsedAddressComponents
  ): GeocodedCandidate[] {
    const list: GeocodedCandidate[] = [];

    for (const item of data) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lon)) continue;

      const addr = item.address || {};
      const itemCity =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.village ||
        addr.county ||
        null;

      const itemState = addr["ISO3166-2-lvl4"]
        ? addr["ISO3166-2-lvl4"].replace("BR-", "")
        : addr.state
        ? STATE_NAME_TO_UF[normalizeKey(addr.state)] || addr.state
        : null;

      const precision =
        addr.house_number || item.addresstype === "building"
          ? "exact"
          : addr.road
          ? "street"
          : "neighborhood";

      list.push({
        id: `nom-${item.place_id}`,
        displayName: item.display_name,
        formattedAddress: this.buildFormattedAddress(item, parsed),
        lat,
        lon,
        logradouro: addr.road || addr.pedestrian || parsed.street || null,
        street: addr.road || addr.pedestrian || parsed.street || null,
        numero: addr.house_number || parsed.number || null,
        number: addr.house_number || parsed.number || null,
        complemento: parsed.complemento,
        bairro: addr.suburb || addr.neighbourhood || addr.city_district || parsed.neighborhood || null,
        neighborhood:
          addr.suburb || addr.neighbourhood || addr.city_district || parsed.neighborhood || null,
        municipio: itemCity || parsed.city || null,
        city: itemCity || parsed.city || null,
        uf: itemState || parsed.state || null,
        state: itemState || parsed.state || null,
        cep: addr.postcode || parsed.postalCode || null,
        postalCode: addr.postcode || parsed.postalCode || null,
        precision,
        source: "nominatim",
        validationStatus: "CONFIRMADO",
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      });
    }

    return list;
  }

  /**
   * Photon (Komoot OSM) Geocoding
   */
  private async queryPhoton(
    query: string,
    parsed: ParsedAddressComponents
  ): Promise<GeocodedCandidate[]> {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
      const res = await fetchWithTimeout(
        url,
        { headers: { "User-Agent": "RebussOps/2.0" } },
        4500
      );
      if (!res.ok) return [];

      const data = (await res.json()) as any;
      if (!data.features || !Array.isArray(data.features)) return [];

      const results: GeocodedCandidate[] = [];

      for (const feat of data.features) {
        const coords = feat.geometry?.coordinates;
        const props = feat.properties || {};
        if (!Array.isArray(coords) || coords.length < 2) continue;
        if (props.countrycode && props.countrycode.toUpperCase() !== "BR") continue;

        const lon = Number(coords[0]);
        const lat = Number(coords[1]);
        if (isNaN(lat) || isNaN(lon)) continue;

        const stateUf = props.state
          ? STATE_NAME_TO_UF[normalizeKey(props.state)] || props.state
          : null;

        const precision =
          props.housenumber
            ? "exact"
            : props.street || props.name
            ? "street"
            : "neighborhood";

        const parts = [
          props.street || props.name || parsed.street,
          props.housenumber || parsed.number,
          props.district || props.locality || parsed.neighborhood,
          props.city || parsed.city,
          stateUf || parsed.state,
          props.postcode || parsed.postalCode,
        ].filter(Boolean);

        results.push({
          id: `pho-${props.osm_id || `${lat}-${lon}`}`,
          displayName: parts.join(", "),
          formattedAddress: parts.join(", "),
          lat,
          lon,
          logradouro: props.street || props.name || parsed.street || null,
          street: props.street || props.name || parsed.street || null,
          numero: props.housenumber || parsed.number || null,
          number: props.housenumber || parsed.number || null,
          complemento: parsed.complemento,
          bairro: props.district || props.locality || parsed.neighborhood || null,
          neighborhood: props.district || props.locality || parsed.neighborhood || null,
          municipio: props.city || parsed.city || null,
          city: props.city || parsed.city || null,
          uf: stateUf || parsed.state || null,
          state: stateUf || parsed.state || null,
          cep: props.postcode || parsed.postalCode || null,
          postalCode: props.postcode || parsed.postalCode || null,
          precision,
          source: "photon",
          validationStatus: "CONFIRMADO",
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * 3. RANKING, DIVERGENCE DETECTION AND VALIDATION ENGINE
   * Crucial: Compares requested city/state/street against found candidate.
   * If candidate is in another municipality, marks DIVERGENTE.
   * Sorts valid matching candidates first.
   */
  public rankAndClassifyCandidates(
    candidates: GeocodedCandidate[],
    parsed: ParsedAddressComponents
  ): GeocodedCandidate[] {
    if (!candidates.length) return [];

    const normRequestedCity = normalizeKey(parsed.city || "");
    const normRequestedState = normalizeKey(parsed.state || "");
    const normRequestedStreet = normalizeKey(
      this.expandBrazilianAbbreviations(parsed.street || "")
    );
    const requestedNumber = parsed.number?.trim() || "";

    // Deduplicate candidates by coordinate proximity (< 50 meters)
    const uniqueCandidates: GeocodedCandidate[] = [];
    for (const c of candidates) {
      const isDupe = uniqueCandidates.some(
        (u) => haversineMeters(c.lat, c.lon, u.lat, u.lon) < 50
      );
      if (!isDupe) uniqueCandidates.push(c);
    }

    for (const c of uniqueCandidates) {
      let score = 0;
      const divergenceDetails: AddressDivergence = {
        hasDivergence: false,
        summary: "",
      };

      const candCityNorm = normalizeKey(c.city || "");
      const candStateNorm = normalizeKey(c.state || "");
      const candStreetNorm = normalizeKey(c.street || c.logradouro || "");

      // 1. City / Município Evaluation
      if (normRequestedCity && candCityNorm) {
        const isBothDf =
          (normRequestedState === "df" || normRequestedCity === "brasilia") &&
          (candStateNorm === "df" || candCityNorm === "brasilia");

        if (normRequestedCity === candCityNorm || isBothDf) {
          score += 50;
        } else {
          // If city does not match, penalize heavily and record divergence!
          score -= 100;
          divergenceDetails.hasDivergence = true;
          divergenceDetails.type = "CITY_MISMATCH";
          divergenceDetails.requestedCity = parsed.city!;
          divergenceDetails.foundCity = c.city!;
        }
      }

      // 2. State / UF Evaluation
      if (normRequestedState && candStateNorm) {
        if (normRequestedState === candStateNorm) {
          score += 30;
        } else {
          score -= 100;
          divergenceDetails.hasDivergence = true;
          divergenceDetails.type = divergenceDetails.type || "STATE_MISMATCH";
          divergenceDetails.requestedState = parsed.state!;
          divergenceDetails.foundState = c.state!;
        }
      }

      // 3. Street / Logradouro Evaluation
      if (normRequestedStreet && candStreetNorm) {
        if (
          candStreetNorm.includes(normRequestedStreet) ||
          normRequestedStreet.includes(candStreetNorm)
        ) {
          score += 40;
        } else {
          // Check keyword overlap
          const reqKeywords = normRequestedStreet.split(" ").filter((w) => w.length >= 4);
          const matchedKw = reqKeywords.filter((w) => candStreetNorm.includes(w));
          if (matchedKw.length > 0) {
            score += matchedKw.length * 15;
          } else {
            score -= 20;
          }
        }
      }

      // 4. House Number Evaluation
      if (requestedNumber && c.number) {
        if (c.number.trim() === requestedNumber) {
          score += 25;
          c.precision = "exact";
        } else {
          // House number divergence
          divergenceDetails.requestedNumber = requestedNumber;
          divergenceDetails.foundNumber = c.number.trim();
        }
      }

      // 5. CEP Evaluation
      if (parsed.postalCode && c.postalCode) {
        const reqCep5 = parsed.postalCode.replace(/\D/g, "").slice(0, 5);
        const candCep5 = c.postalCode.replace(/\D/g, "").slice(0, 5);
        if (reqCep5 && candCep5 && reqCep5 === candCep5) {
          score += 20;
        }
      }

      c.score = score;

      // Assign Validation Status based on divergence check
      if (divergenceDetails.hasDivergence) {
        c.validationStatus = "DIVERGENTE";
        let summary = "Divergência de localização detectada: ";
        if (divergenceDetails.requestedCity && divergenceDetails.foundCity) {
          summary += `Você buscou em ${divergenceDetails.requestedCity}${
            parsed.state ? ` - ${parsed.state}` : ""
          }, mas o endereço retornado está em ${divergenceDetails.foundCity}${
            c.state ? ` - ${c.state}` : ""
          }.`;
        } else if (divergenceDetails.requestedState && divergenceDetails.foundState) {
          summary += `Estado divergente (solicitado: ${divergenceDetails.requestedState}, retornado: ${divergenceDetails.foundState}).`;
        }
        divergenceDetails.summary = summary;
        c.divergence = divergenceDetails;
      } else {
        c.validationStatus = "CONFIRMADO";
        c.divergence = null;
      }
    }

    // Sort candidates:
    // Highest priority: CONFIRMADO candidates first, then by score descending
    uniqueCandidates.sort((a, b) => {
      if (a.validationStatus === "CONFIRMADO" && b.validationStatus !== "CONFIRMADO") {
        return -1;
      }
      if (a.validationStatus !== "CONFIRMADO" && b.validationStatus === "CONFIRMADO") {
        return 1;
      }
      return (b.score || 0) - (a.score || 0);
    });

    return uniqueCandidates;
  }

  /**
   * Reverse Geocode (when given coordinates or link)
   */
  private async reverseGeocode(
    lat: number,
    lon: number,
    parsed: ParsedAddressComponents
  ): Promise<GeocodedCandidate> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1`;
      const res = await fetchNominatim(url, 5000);
      if (res.ok) {
        const data = (await res.json()) as any;
        const addr = data.address || {};
        const city =
          addr.city || addr.town || addr.municipality || addr.village || parsed.city || null;
        const state = addr["ISO3166-2-lvl4"]
          ? addr["ISO3166-2-lvl4"].replace("BR-", "")
          : addr.state
          ? STATE_NAME_TO_UF[normalizeKey(addr.state)] || addr.state
          : parsed.state || null;

        return {
          id: `rev-${data.place_id || `${lat}-${lon}`}`,
          displayName: data.display_name || `${lat}, ${lon}`,
          formattedAddress: this.buildFormattedAddress(data, parsed),
          lat,
          lon,
          logradouro: addr.road || parsed.street || null,
          street: addr.road || parsed.street || null,
          numero: addr.house_number || parsed.number || null,
          number: addr.house_number || parsed.number || null,
          complemento: parsed.complemento,
          bairro: addr.suburb || addr.neighbourhood || addr.city_district || parsed.neighborhood || null,
          neighborhood:
            addr.suburb || addr.neighbourhood || addr.city_district || parsed.neighborhood || null,
          municipio: city,
          city,
          uf: state,
          state,
          cep: addr.postcode || parsed.postalCode || null,
          postalCode: addr.postcode || parsed.postalCode || null,
          precision: "exact",
          source: "nominatim",
          validationStatus: "CONFIRMADO",
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
        };
      }
    } catch {
      // Fallback
    }

    return {
      id: `coords-${lat}-${lon}`,
      displayName: parsed.normalizedInput || `${lat}, ${lon}`,
      formattedAddress: parsed.normalizedInput || `Coordenadas: ${lat}, ${lon}`,
      lat,
      lon,
      logradouro: parsed.street,
      street: parsed.street,
      numero: parsed.number,
      number: parsed.number,
      complemento: parsed.complemento,
      bairro: parsed.neighborhood,
      neighborhood: parsed.neighborhood,
      municipio: parsed.city,
      city: parsed.city,
      uf: parsed.state,
      state: parsed.state,
      cep: parsed.postalCode,
      postalCode: parsed.postalCode,
      precision: "exact",
      source: "url_coords",
      validationStatus: "CONFIRMADO",
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    };
  }

  private buildFormattedAddress(nomItem: any, parsed: ParsedAddressComponents): string {
    const addr = nomItem.address || {};
    const street = addr.road || addr.pedestrian || parsed.street;
    const number = addr.house_number || parsed.number;
    const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || parsed.neighborhood;
    const city =
      addr.city || addr.town || addr.municipality || addr.village || parsed.city;
    const state = addr["ISO3166-2-lvl4"]
      ? addr["ISO3166-2-lvl4"].replace("BR-", "")
      : addr.state
      ? STATE_NAME_TO_UF[normalizeKey(addr.state)] || addr.state
      : parsed.state;
    const cep = addr.postcode || parsed.postalCode;

    const parts = [
      street ? (number ? `${street}, ${number}` : street) : null,
      neighborhood,
      city && state ? `${city} - ${state}` : city || state,
      cep,
    ].filter(Boolean);

    return parts.join(", ") || nomItem.display_name;
  }

  /**
   * 4. NEARBY PUBLIC TRANSIT STATIONS
   * Finds nearby transit and returns the closest station by straight-line distance.
   */
  async findNearbyTransit(
    destLat: number,
    destLon: number
  ): Promise<{
    stations: TransitStationResult[];
    radiusMetersUsed: number;
    walkingRoutesResolved: boolean;
    message?: string | null;
  }> {
    const searchRadii = [3500, 6000, 9500];
    let radiusUsed = searchRadii[0];

    // 1. Initial list from High-Speed Verified Brazilian Registry
    const allRegistered: TransitStationResult[] = REGISTERED_TRANSIT_STATIONS.map((st) => {
      const dist = haversineMeters(destLat, destLon, st.lat, st.lon);
      const stationFullName = `${st.name} (${st.transportLabel}), ${st.city} - ${st.state}`;
      const stationParam = encodeURIComponent(stationFullName);

      return {
        id: st.id,
        name: st.name,
        transportType: st.transportType,
        transportLabel: st.transportLabel,
        line: st.line || null,
        operator: st.operator || null,
        address: `${st.city} - ${st.state}`,
        city: st.city,
        region: st.state,
        lat: st.lat,
        lon: st.lon,
        straightDistanceMeters: dist,
        walkingDistanceMeters: null,
        walkingDurationMinutes: null,
        routeVerified: false,
        stationMapsUrl: `https://www.google.com/maps/search/?api=1&query=${stationParam}`,
        walkingRouteMapsUrl: "",
      };
    });

    let collected: TransitStationResult[] = [];

    for (const radius of searchRadii) {
      radiusUsed = radius;
      const matched = allRegistered.filter((s) => s.straightDistanceMeters <= radius);
      if (matched.length >= 2) {
        collected = matched;
        break;
      }
    }
    if (collected.length === 0) {
      collected = allRegistered.filter((s) => s.straightDistanceMeters <= searchRadii[2]);
    }

    // 2. Supplement with fast Overpass query (timeout 3.5s) if available to discover additional local terminals
    try {
      const overpassElements = await Promise.race([
        this.queryOverpassTransit(destLat, destLon, radiusUsed),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 3500)),
      ]);

      if (Array.isArray(overpassElements) && overpassElements.length > 0) {
        for (const el of overpassElements) {
          const tags = el.tags || {};
          const rawName = tags["name:pt"] || tags.name || tags.official_name;
          if (!rawName) continue;

          const sLat = typeof el.lat === "number" ? el.lat : el.center?.lat;
          const sLon = typeof el.lon === "number" ? el.lon : el.center?.lon;
          if (typeof sLat !== "number" || typeof sLon !== "number") continue;

          const classification = this.classifyTransitElement(tags);
          const straightDistanceMeters = haversineMeters(destLat, destLon, sLat, sLon);
          if (straightDistanceMeters > radiusUsed) continue;

          const stationCity = tags["addr:city"] || "";
          const stationState = tags["addr:state"] || "";
          const cityPart = stationCity ? `, ${stationCity}${stationState ? ` - ${stationState}` : ""}` : "";
          const stationFullName = `${rawName.trim()} (${classification.label})${cityPart}`;
          const stationParam = encodeURIComponent(stationFullName);

          collected.push({
            id: `osm-${el.type || "node"}-${el.id}`,
            name: rawName.trim(),
            transportType: classification.type,
            transportLabel: classification.label,
            line: tags.line || tags.ref || null,
            operator: tags.network || tags.operator || null,
            address: tags["addr:street"] || null,
            city: tags["addr:city"] || null,
            region: tags["addr:state"] || null,
            lat: sLat,
            lon: sLon,
            straightDistanceMeters,
            walkingDistanceMeters: null,
            walkingDurationMinutes: null,
            routeVerified: false,
            stationMapsUrl: `https://www.google.com/maps/search/?api=1&query=${stationParam}`,
            walkingRouteMapsUrl: "",
          });
        }
      }
    } catch {
      // Overpass failure or timeout handled gracefully
    }

    if (!collected.length) {
      return {
        stations: [],
        radiusMetersUsed: radiusUsed,
        walkingRoutesResolved: false,
        message: `Nenhuma estação de metrô, trem ou terminal de ônibus foi encontrado em um raio de até ${(
          radiusUsed / 1000
        ).toFixed(0)} km deste endereço.`,
      };
    }

    collected.sort((a, b) => a.straightDistanceMeters - b.straightDistanceMeters);

    // Deduplicate stations with same name or within 150m
    const deduplicated: TransitStationResult[] = [];
    for (const item of collected) {
      const normName = normalizeKey(item.name)
        .replace(/^(estacao|terminal|term\.|est\.|metro)\s+/i, "")
        .trim();

      const existing = deduplicated.find((d) => {
        const dNorm = normalizeKey(d.name)
          .replace(/^(estacao|terminal|term\.|est\.|metro)\s+/i, "")
          .trim();
        const distBetween = haversineMeters(item.lat, item.lon, d.lat, d.lon);
        return (normName === dNorm && distBetween < 1000) || distBetween < 150;
      });

      if (!existing) {
        deduplicated.push(item);
      } else {
        if (!existing.line && item.line) existing.line = item.line;
        if (!existing.operator && item.operator) existing.operator = item.operator;
      }
    }

    // A lista já está ordenada por distância em linha reta; a mensagem usa apenas a primeira.
    const topCandidates = deduplicated.slice(0, 1);


    return {
      stations: topCandidates,
      radiusMetersUsed: radiusUsed,
      walkingRoutesResolved: false,
      message: null,
    };
  }

  private classifyTransitElement(tags: Record<string, string>): {
    type: "METRO" | "TREM" | "TERMINAL_ONIBUS" | "ESTACAO_INTEGRADA";
    label: string;
  } {
    const railwayTag = (tags.railway || "").toLowerCase();
    const amenityTag = (tags.amenity || "").toLowerCase();
    const highwayTag = (tags.highway || "").toLowerCase();
    const nameLower = (tags["name:pt"] || tags.name || "").toLowerCase();
    const stateUf = (tags["addr:state"] || "").toUpperCase();

    if (
      amenityTag === "bus_station" ||
      highwayTag === "bus_station" ||
      nameLower.startsWith("terminal") ||
      nameLower.startsWith("estação tubo") ||
      nameLower.startsWith("estacao tubo") ||
      nameLower.includes("rodoviária") ||
      nameLower.includes("rodoviaria") ||
      nameLower.includes("rodoferroviária") ||
      nameLower.includes("rodoferroviaria")
    ) {
      return { type: "TERMINAL_ONIBUS", label: "Terminal de Ônibus" };
    }

    const isBrasiliaSubway =
      stateUf === "DF" &&
      railwayTag === "station" &&
      /\b(\d{3}\s+(sul|norte)|estrada\s+parque|central|galeria|feira|guara|aguas\s+claras|concessionarias|taguatinga|samambaia|ceilandia|praca\s+do\s+relogio)\b/i.test(
        nameLower
      );

    if (tags.station === "subway" || railwayTag === "subway" || isBrasiliaSubway) {
      return { type: "METRO", label: "Estação de Metrô" };
    }

    if (
      railwayTag === "station" ||
      railwayTag === "halt" ||
      tags.station === "train" ||
      nameLower.includes("cptm") ||
      nameLower.includes("supervia")
    ) {
      return { type: "TREM", label: "Estação de Trem" };
    }

    return { type: "ESTACAO_INTEGRADA", label: "Ponto de Integração" };
  }

  private async queryOverpassTransit(
    lat: number,
    lon: number,
    radiusMeters: number
  ): Promise<any[]> {
    const overpassQuery = `
[out:json][timeout:12];
(
  nwr(around:${radiusMeters},${lat},${lon})["railway"~"^(station|halt|tram_stop)$"];
  nwr(around:${radiusMeters},${lat},${lon})["station"~"^(subway|train|light_rail|monorail)$"];
  nwr(around:${radiusMeters},${lat},${lon})["amenity"="bus_station"];
  nwr(around:${radiusMeters},${lat},${lon})["highway"="bus_station"];
  nwr(around:${radiusMeters},${lat},${lon})["public_transport"="station"];
);
out center tags;
    `.trim();

    const mirrors = [
      "https://overpass-api.de/api/interpreter",
      "https://lz4.overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ];

    for (const mirror of mirrors) {
      try {
        const res = await fetchWithTimeout(
          mirror,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "RebussOps/2.0",
            },
            body: `data=${encodeURIComponent(overpassQuery)}`,
          },
          8000
        );

        if (res.ok) {
          const json = (await res.json()) as any;
          if (Array.isArray(json.elements)) {
            return json.elements;
          }
        }
      } catch {
        // Try next mirror
      }
    }

    return [];
  }

}

function typesMatch(types: string[] | undefined, target: string[]): boolean {
  if (!types || !Array.isArray(types)) return false;
  return target.some((t) => types.includes(t));
}

export const scaleGeneratorService = new ScaleGeneratorService();
