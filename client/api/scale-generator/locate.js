import jwt from "jsonwebtoken";
import { REGISTERED_TRANSIT_STATIONS } from "../_data/registered-transit-stations.js";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

function verifyUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("token="));
    if (tokenCookie) {
      token = tokenCookie.substring(6).trim();
    }
  }

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function cleanAndNormalizeAddress(rawInput) {
  const cepMatch = rawInput.match(/\b\d{5}-?\d{3}\b/);
  const cep = cepMatch ? cepMatch[0].replace(/\D/g, "") : null;
  const numMatch = rawInput.match(/(?:,\s*|n[º°.]?\s*|\s+)(\d{1,5})\b/i);
  const extractedNumber = numMatch ? numMatch[1] : null;

  let cleaned = rawInput
    .replace(/\bEstr\.\s*/gi, "Estrada ")
    .replace(/\bAv\.\s*/gi, "Avenida ")
    .replace(/\bR\.\s*/gi, "Rua ")
    .replace(/\bAl\.\s*/gi, "Alameda ")
    .replace(/\bRod\.\s*/gi, "Rodovia ")
    .replace(/\bPça\.\s*/gi, "Praça ")
    .replace(/\bTrav\.\s*/gi, "Travessa ");

  // Remove complementos internos comuns que quebram os motores de mapas
  cleaned = cleaned.replace(
    /[-–—]?\s*(?:piso\s+t[eé]rreo|piso\s+superior|t[eé]rreo|loja\s*\d+|sala\s*\d+|bloco\s*[a-z0-9]+|apto\s*\d+|apartamento\s*\d+|andar\s*\d+|galp[aã]o\s*\d+|fundos|subsolo|mezanino)\s*[-–—]?/gi,
    ", "
  );
  cleaned = cleaned
    .replace(/[,–—\s]+,/g, ",")
    .replace(/\s+/g, " ")
    .replace(/^[,–—\s]+|[,–—\s]+$/g, "");

  return { cleaned, cep, extractedNumber };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const user = verifyUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado. Faça login para continuar.",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {}
  }

  const rawInput = (
    req.method === "GET"
      ? (req.query.input || req.query.address || req.query.endereco || "")
      : (body?.input || "")
  ).trim();

  if (!rawInput) {
    return res.status(400).json({
      success: false,
      message: "Endereço ou termo de busca obrigatório.",
    });
  }

  const cityHint = (req.method === "GET" ? req.query.cityHint : body?.cityHint) || "";
  const stateHint = (req.method === "GET" ? req.query.stateHint : body?.stateHint) || "";

  try {
    let searchQuery = rawInput;
    let extractedCoords = null;

    // Se for URL do Google Maps, tenta extrair coordenadas ou termo de pesquisa
    if (/^https?:\/\//i.test(rawInput)) {
      const coordMatch = rawInput.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) {
        extractedCoords = {
          lat: parseFloat(coordMatch[1]),
          lon: parseFloat(coordMatch[2]),
        };
      } else {
        try {
          const headRes = await fetch(rawInput, {
            method: "HEAD",
            redirect: "follow",
            headers: { "User-Agent": "RebussOps/2.0 (logistica@rebuss.com)" },
          });
          const finalUrl = headRes.url;
          const finalCoordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (finalCoordMatch) {
            extractedCoords = {
              lat: parseFloat(finalCoordMatch[1]),
              lon: parseFloat(finalCoordMatch[2]),
            };
          } else {
            const queryMatch = finalUrl.match(/query=([^&]+)/) || finalUrl.match(/q=([^&]+)/);
            if (queryMatch) {
              searchQuery = decodeURIComponent(queryMatch[1]);
            }
          }
        } catch {
          // Continua com searchQuery
        }
      }
    }

    let candidates = [];
    let viaCepData = null;
    const { cleaned, cep, extractedNumber } = cleanAndNormalizeAddress(searchQuery);

    if (extractedCoords) {
      // Coordenadas diretas
      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${extractedCoords.lat}&lon=${extractedCoords.lon}&addressdetails=1`;
      try {
        const revRes = await fetch(reverseUrl, {
          headers: {
            "User-Agent": "RebussOps/2.0 (logistica@rebuss.com)",
            "Accept-Language": "pt-BR,pt;q=0.9",
          },
        });
        const revData = await revRes.json();
        if (revData && revData.display_name) {
          candidates = [revData];
        }
      } catch {}

      if (!candidates || candidates.length === 0) {
        candidates = [
          {
            place_id: `coords-${extractedCoords.lat}-${extractedCoords.lon}`,
            display_name: `Coordenadas (${extractedCoords.lat.toFixed(5)}, ${extractedCoords.lon.toFixed(5)})`,
            lat: String(extractedCoords.lat),
            lon: String(extractedCoords.lon),
            address: {},
          },
        ];
      }
    } else {
      // Pipeline Inteligente de Múltiplas Queries Progressivas
      const searchQueries = [cleaned];

      // Consulta ViaCEP se houver CEP
      if (cep) {
        try {
          const vcRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            headers: { "User-Agent": "RebussOps/2.0" },
          });
          const vc = await vcRes.json();
          if (vc && !vc.erro) {
            viaCepData = vc;
            const numPart = extractedNumber ? `, ${extractedNumber}` : "";
            if (vc.logradouro) {
              searchQueries.push(`${vc.logradouro}${numPart}, ${vc.localidade} - ${vc.uf}`);
              searchQueries.push(`${vc.logradouro}, ${vc.localidade} - ${vc.uf}`);
            }
          }
        } catch {}
      }

      // Tenta remover bairro intermediário que costuma conflitar entre Google e OSM
      const parts = cleaned.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        const streetPart = parts[0];
        const numPart = parts.find((p) => /^\d+$/.test(p)) || extractedNumber;
        const cityStatePart = parts[parts.length - 1];
        if (streetPart && cityStatePart) {
          searchQueries.push(`${streetPart}${numPart ? ", " + numPart : ""}, ${cityStatePart}`);
        }
      }

      // Tenta com cityHint e stateHint se fornecidos
      if (cityHint && !cleaned.toLowerCase().includes(cityHint.toLowerCase())) {
        searchQueries.push(`${cleaned}, ${cityHint}${stateHint ? " - " + stateHint : ""}`);
      }

      // Executa as queries progressivamente no Nominatim
      for (const q of searchQueries) {
        try {
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q
          )}&addressdetails=1&limit=5&countrycodes=br`;

          const geoRes = await fetch(nominatimUrl, {
            headers: {
              "User-Agent": "RebussOps/2.0 (logistica@rebuss.com)",
              "Accept-Language": "pt-BR,pt;q=0.9",
            },
          });
          const results = await geoRes.json();
          if (results && results.length > 0) {
            candidates = results;
            break;
          }
        } catch {}
      }

      // Fallback para Photon API se Nominatim não encontrar
      if (!candidates || candidates.length === 0) {
        for (const q of searchQueries.slice(0, 2)) {
          try {
            const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`;
            const phRes = await fetch(photonUrl);
            const phData = await phRes.json();
            if (phData?.features && phData.features.length > 0) {
              candidates = phData.features.map((f, i) => {
                const p = f.properties || {};
                const [lon, lat] = f.geometry.coordinates;
                const dName = [p.name || p.street, p.housenumber, p.district, p.city, p.state, p.postcode]
                  .filter(Boolean)
                  .join(", ");
                return {
                  place_id: `photon-${i}-${lat}-${lon}`,
                  display_name: dName || q,
                  lat: String(lat),
                  lon: String(lon),
                  address: {
                    road: p.street || p.name,
                    house_number: p.housenumber,
                    suburb: p.district,
                    city: p.city,
                    state: p.state,
                    postcode: p.postcode,
                  },
                };
              });
              break;
            }
          } catch {}
        }
      }
    }

    const primary = candidates && candidates[0] ? candidates[0] : null;

    if (!primary) {
      return res.status(200).json({
        success: true,
        status: "NAO_LOCALIZADO",
        parsedInput: {
          originalInput: rawInput,
          normalizedInput: cleaned || rawInput,
          isUrl: /^https?:\/\//i.test(rawInput),
          city: cityHint || viaCepData?.localidade || null,
          municipio: cityHint || viaCepData?.localidade || null,
          state: stateHint || viaCepData?.uf || null,
          uf: stateHint || viaCepData?.uf || null,
          postalCode: cep || null,
          cep: cep || null,
        },
        location: null,
        candidates: [],
        stations: [],
        divergence: {
          hasDivergence: true,
          summary: "Não foi possível confirmar a localização deste endereço nos serviços de mapas. Verifique a grafia ou informe rua, bairro e cidade.",
        },
        stationSearchMeta: {
          radiusMetersUsed: 3500,
          totalFound: 0,
          walkingRoutesResolved: false,
          message: "Nenhum ponto localizado para o endereço informado.",
        },
      });
    }

    const lat = parseFloat(primary.lat);
    const lon = parseFloat(primary.lon);

    const addr = primary.address || {};
    const street = addr.road || addr.pedestrian || addr.street || viaCepData?.logradouro || null;
    const number = addr.house_number || extractedNumber || null;
    const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || viaCepData?.bairro || null;
    const city = addr.city || addr.town || addr.municipality || addr.village || viaCepData?.localidade || cityHint || "São Paulo";
    const state = addr.state || viaCepData?.uf || stateHint || "SP";
    const postalCode = addr.postcode || viaCepData?.cep || cep || null;

    const precision = number ? "exact" : street ? "street" : neighborhood ? "neighborhood" : "city";
    const formattedAddress = primary.display_name || `${street || cleaned}${number ? ", " + number : ""} - ${city} - ${state}`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      formattedAddress
    )}`;

    const locationCandidate = {
      id: String(primary.place_id || `osm-${lat}-${lon}`),
      displayName: primary.display_name || formattedAddress,
      formattedAddress,
      lat,
      lon,
      street,
      logradouro: street,
      number,
      numero: number,
      complemento: null,
      neighborhood,
      bairro: neighborhood,
      city,
      municipio: city,
      state,
      uf: state,
      postalCode,
      cep: postalCode,
      precision,
      confidenceNote: null,
      googleMapsUrl,
      source: "nominatim",
      validationStatus: "CONFIRMADO",
      divergence: null,
    };

    const formattedCandidates = (candidates || []).map((c) => {
      const cAddr = c.address || {};
      const cStreet = cAddr.road || cAddr.pedestrian || cAddr.street || street;
      const cNumber = cAddr.house_number || number;
      const cNeighborhood = cAddr.suburb || cAddr.neighbourhood || neighborhood;
      const cCity = cAddr.city || cAddr.town || cAddr.municipality || city;
      const cState = cAddr.state || state;
      const cLat = parseFloat(c.lat);
      const cLon = parseFloat(c.lon);
      return {
        id: String(c.place_id || `cand-${cLat}-${cLon}`),
        displayName: c.display_name || formattedAddress,
        formattedAddress: c.display_name || formattedAddress,
        lat: cLat,
        lon: cLon,
        street: cStreet,
        logradouro: cStreet,
        number: cNumber,
        numero: cNumber,
        complemento: null,
        neighborhood: cNeighborhood,
        bairro: cNeighborhood,
        city: cCity,
        municipio: cCity,
        state: cState,
        uf: cState,
        postalCode: cAddr.postcode || postalCode,
        cep: cAddr.postcode || postalCode,
        precision: (cNumber ? "exact" : cStreet ? "street" : "city"),
        confidenceNote: null,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.display_name || `${cLat},${cLon}`)}`,
        source: "nominatim",
        validationStatus: "CONFIRMADO",
        divergence: null,
      };
    });

    // Calcula estações próximas a partir da base oficial verificada
    const originParam = encodeURIComponent(formattedAddress || `${lat},${lon}`);
    const searchRadii = [3500, 6000, 9500, 15000];
    let radiusUsed = searchRadii[0];

    const allMappedStations = (REGISTERED_TRANSIT_STATIONS || []).map((st) => {
      const dist = haversineMeters(lat, lon, st.lat, st.lon);
      const stationFullName = `${st.name} (${st.transportLabel}), ${st.city} - ${st.state}`;
      const stationParam = encodeURIComponent(stationFullName);

      const straightMeters = Math.round(dist);
      const walkingMeters = Math.round(dist * 1.25);
      const walkingMinutes = Math.max(1, Math.round(walkingMeters / 80));

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
        straightDistanceMeters: straightMeters,
        walkingDistanceMeters: walkingMeters,
        walkingDurationMinutes: walkingMinutes,
        routeVerified: true,
        stationMapsUrl: `https://www.google.com/maps/search/?api=1&query=${stationParam}`,
        walkingRouteMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${stationParam}&travelmode=walking`,
      };
    });

    let nearbyStations = [];
    for (const radius of searchRadii) {
      radiusUsed = radius;
      const matched = allMappedStations.filter((s) => s.straightDistanceMeters <= radius);
      if (matched.length >= 2) {
        nearbyStations = matched;
        break;
      }
    }

    if (nearbyStations.length === 0) {
      nearbyStations = allMappedStations.filter((s) => s.straightDistanceMeters <= searchRadii[3]);
    }

    nearbyStations.sort((a, b) => a.straightDistanceMeters - b.straightDistanceMeters);
    const finalStations = nearbyStations.slice(0, 10);

    return res.status(200).json({
      success: true,
      status: "CONFIRMADO",
      parsedInput: {
        originalInput: rawInput,
        normalizedInput: cleaned,
        isUrl: /^https?:\/\//i.test(rawInput),
        street,
        logradouro: street,
        number,
        numero: number,
        neighborhood,
        bairro: neighborhood,
        city,
        municipio: city,
        state,
        uf: state,
        postalCode,
        cep: postalCode,
      },
      location: locationCandidate,
      candidates: formattedCandidates,
      stations: finalStations,
      divergence: null,
      stationSearchMeta: {
        radiusMetersUsed: radiusUsed,
        totalFound: finalStations.length,
        walkingRoutesResolved: true,
        message: finalStations.length === 0 ? "Nenhuma estação cadastrada próxima encontrada." : null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Erro ao localizar coordenadas geográficas.",
      error: err.message,
    });
  }
}
