import { api } from "./api.js";

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
  source?: "google" | "nominatim" | "photon" | "viacep_coords" | "url_coords";
  validationStatus?: AddressValidationStatus;
  divergence?: AddressDivergence | null;
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

export interface LocateRequestPayload {
  input: string;
  cityHint?: string;
  stateHint?: string;
  selectedLat?: number;
  selectedLon?: number;
  selectedDisplayName?: string;
  forceConfirmed?: boolean;
}

const clientCache = new Map<string, LocateResponse>();

export const scaleGeneratorApi = {
  async locateAddress(
    payload: LocateRequestPayload,
    signal?: AbortSignal
  ): Promise<LocateResponse> {
    const cacheKey = JSON.stringify({
      input: payload.input.trim().toLowerCase(),
      cityHint: payload.cityHint || "",
      stateHint: payload.stateHint || "",
      selectedLat: payload.selectedLat ?? null,
      selectedLon: payload.selectedLon ?? null,
      forceConfirmed: payload.forceConfirmed ?? false,
    });

    if (clientCache.has(cacheKey)) {
      return clientCache.get(cacheKey)!;
    }

    const data = await api.post<LocateResponse>(
      "/scale-generator/locate",
      payload,
      { signal }
    );

    clientCache.set(cacheKey, data);
    return data;
  },

  clearCache() {
    clientCache.clear();
  },
};
