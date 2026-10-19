import "dotenv/config";
import { scaleGeneratorService, TransitStationResult } from "../modules/scale-generator/scale-generator.service";
import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

function buildStationLineForMessage(station: TransitStationResult): string {
  const icon =
    station.transportType === "METRO"
      ? "🚇"
      : station.transportType === "TREM"
      ? "🚆"
      : "🚌";
  const lineInfo = station.line ? ` (${station.line})` : "";
  const distanceInfo =
    station.routeVerified && station.walkingDistanceMeters
      ? ` — *${formatDistance(station.walkingDistanceMeters)} a pé* (~${
          station.walkingDurationMinutes
        } min de caminhada)`
      : ` — *${formatDistance(station.straightDistanceMeters)} em linha reta*`;

  return `${icon} *${station.transportLabel} de referência:* ${station.name}${lineInfo}${distanceInfo}`;
}

async function runTests() {
  console.log("==========================================================");
  console.log("  REBUSS OPS — AUDITORIA & TESTE REAL DO GERADOR DE ESCALAS");
  console.log("==========================================================\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO A — Endereço completo colado do Google Maps (Brasília - DF)
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO A] Endereço completo colado do Google Maps:");
  const addressA = "St. Sudoeste Comércio Local Sudoeste 6 - Sudoeste, Brasília - DF, 70680-650";
  console.log(`   Input: "${addressA}"`);

  const resA = await scaleGeneratorService.locateAndFindTransit({
    input: addressA,
  });

  console.log("   [Interpretação]:", {
    street: resA.parsedInput.street,
    neighborhood: resA.parsedInput.neighborhood,
    city: resA.parsedInput.city,
    state: resA.parsedInput.state,
    postalCode: resA.parsedInput.postalCode,
  });
  console.log("   [Localização Confirmada]:", {
    formattedAddress: resA.location.formattedAddress,
    lat: resA.location.lat,
    lon: resA.location.lon,
    precision: resA.location.precision,
    confidenceNote: resA.location.confidenceNote,
  });

  assert(resA.parsedInput.state === "DF", "Cenário A deve identificar UF = DF");
  assert(
    resA.parsedInput.city?.toLowerCase().includes("brasilia") ||
      resA.parsedInput.city?.toLowerCase().includes("brasília"),
    "Cenário A deve identificar cidade = Brasília"
  );
  assert(resA.parsedInput.postalCode === "70680-650", "Cenário A deve extrair CEP 70680-650");
  assert(
    resA.location.lat < -15.5 && resA.location.lat > -16.1 && resA.location.lon < -47.7 && resA.location.lon > -48.2,
    `Coordenadas de Brasília inválidas: ${resA.location.lat}, ${resA.location.lon}`
  );
  assert(resA.stations.length >= 3, `Cenário A deve retornar pelo menos 3 opções em Brasília, obteve ${resA.stations.length}`);

  console.log(`   [Estações Encontradas (${resA.stations.length}) - Raio: ${resA.stationSearchMeta.radiusMetersUsed}m]:`);
  for (const st of resA.stations.slice(0, 4)) {
    console.log(
      `     - ${st.name} [${st.transportLabel}] | Linha reta: ${st.straightDistanceMeters}m | Caminhada real: ${
        st.walkingDistanceMeters ? `${st.walkingDistanceMeters}m (~${st.walkingDurationMinutes} min)` : "N/D"
      } | Rota verificada: ${st.routeVerified}`
    );
    assert(
      st.walkingDistanceMeters === null || st.walkingDistanceMeters >= st.straightDistanceMeters,
      "Distância de caminhada não pode ser menor que a distância em linha reta"
    );
    assert(st.stationMapsUrl.startsWith("https://www.google.com/maps/"), "Deve conter link para estação no Maps");
    assert(st.walkingRouteMapsUrl.includes("travelmode=walking"), "Deve conter link para rota a pé no Maps");
  }
  console.log("   ✅ CENÁRIO A APROVADO!\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO B — Endereços de diferentes cidades brasileiras e formatos
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO B] Endereços de diferentes cidades e estados brasileiros:");

  const casesB = [
    {
      label: "São Paulo - SP (Av. Paulista com CEP)",
      input: "Av. Paulista, 1578 - Bela Vista, São Paulo - SP, 01310-200",
      expectedState: "SP",
      minStations: 3,
    },
    {
      label: "Curitiba - PR (Rua com número e bairro sem CEP)",
      input: "Rua das Flores, 120 - Centro, Curitiba - PR",
      expectedState: "PR",
      minStations: 3,
    },
    {
      label: "Rio de Janeiro - RJ (Com nome de estabelecimento antes do logradouro)",
      input: "Drogaria Pacheco - Av. Nossa Sra. de Copacabana, 540 - Copacabana, Rio de Janeiro - RJ, 22020-001",
      expectedState: "RJ",
      minStations: 3,
    },
    {
      label: "Link do Google Maps com coordenadas e place",
      input: "https://www.google.com/maps/place/Pra%C3%A7a+da+S%C3%A9+-+S%C3%A9,+S%C3%A3o+Paulo+-+SP/@-23.5503099,-46.6342009,17z",
      expectedState: "SP",
      minStations: 3,
    },
  ];

  for (const testCase of casesB) {
    console.log(`   Testando: ${testCase.label}`);
    const resB = await scaleGeneratorService.locateAndFindTransit({
      input: testCase.input,
    });
    console.log(
      `     -> Localizado: ${resB.location.formattedAddress} (${resB.location.lat.toFixed(5)}, ${resB.location.lon.toFixed(5)})`
    );
    console.log(
      `     -> Estações retornadas: ${resB.stations.length} (Rotas de caminhada verificadas: ${resB.stationSearchMeta.walkingRoutesResolved})`
    );
    if (resB.stations[0]) {
      console.log(
        `     -> Mais próxima: ${resB.stations[0].name} (${resB.stations[0].transportLabel}) - Reta: ${resB.stations[0].straightDistanceMeters}m | Caminhada: ${resB.stations[0].walkingDistanceMeters}m (~${resB.stations[0].walkingDurationMinutes} min)`
      );
    }
    assert(
      resB.parsedInput.state === testCase.expectedState || resB.location.state === testCase.expectedState,
      `Esperava UF ${testCase.expectedState}, obteve ${resB.parsedInput.state} / ${resB.location.state}`
    );
    assert(
      resB.stations.length >= testCase.minStations,
      `Esperava pelo menos ${testCase.minStations} estação(ões) para ${testCase.label}, obteve ${resB.stations.length}`
    );
  }
  console.log("   ✅ CENÁRIO B APROVADO!\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO C — Entradas inválidas, vazias, incompletas ou URLs sem coordenadas
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO C] Entradas inválidas, vazias, incompletas ou URLs sem coordenadas:");

  const invalidCases = [
    {
      label: "Endereço excessivamente curto/incompleto ('Rua')",
      input: "Rua",
      expectedStatus: 422,
    },
    {
      label: "Texto irreconhecível/inexistente",
      input: "Xyzqwerty123456789 Logradouro Inexistente 99999 - Zzz, Www - SP",
      expectedStatus: 404,
    },
    {
      label: "Link externo que não é do Google Maps",
      input: "https://example.com/meu-endereco-qualquer",
      expectedStatus: 400,
    },
    {
      label: "Link do Google Maps sem endereço e sem coordenadas",
      input: "https://www.google.com/maps",
      expectedStatus: 422,
    },
  ];

  for (const inv of invalidCases) {
    let caughtError: any = null;
    try {
      await scaleGeneratorService.locateAndFindTransit({ input: inv.input });
    } catch (err: any) {
      caughtError = err;
    }
    assert(caughtError !== null, `Deveria ter rejeitado: ${inv.label}`);
    assert(
      caughtError.statusCode === inv.expectedStatus,
      `Esperava status ${inv.expectedStatus} para "${inv.label}", mas obteve ${caughtError.statusCode}: ${caughtError.message}`
    );
    console.log(`   [OK] ${inv.label} -> Status ${caughtError.statusCode}: "${caughtError.message}"`);
  }
  console.log("   ✅ CENÁRIO C APROVADO!\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO D — Geração, edição manual e troca de estação sem perder edições
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO D] Geração, edição manual da mensagem e troca de estação:");
  const station1 = resA.stations[0];
  const station2 = resA.stations[1];
  assert(station1 && station2, "Deve haver pelo menos 2 estações para testar troca");

  const stationLine1 = buildStationLineForMessage(station1);
  const stationLine2 = buildStationLineForMessage(station2);

  let generatedMessage = [
    "Bom dia! Segue sua escala operacional:",
    "",
    "📅 *Data:* 20/10/2026 (terça-feira) às *21:00*",
    "🏪 *Local / Operação:* Drogaria Raia — Sudoeste",
    `📍 *Endereço:* ${addressA}`,
    stationLine1,
    `🗺️ *Rota no Google Maps:* ${station1.walkingRouteMapsUrl}`,
    "",
    "Confirma presença? ✅",
    "",
    "_Kelvin — Rebuss_",
  ].join("\n");

  // Simular edição manual do usuário na prévia
  const customManualNote = "⚠️ ATENÇÃO: Levar EPI completo (bota e colete) e procurar Líder Marcos.";
  generatedMessage = generatedMessage.replace(
    "Confirma presença? ✅",
    `${customManualNote}\n\nConfirma presença? ✅`
  );

  // Simular troca de estação preservando a edição manual
  const updatedAfterStationSwitch = generatedMessage
    .replace(stationLine1, stationLine2)
    .replace(
      /🗺️ \*Rota no Google Maps:\* https?:\/\/[^\s]+/,
      `🗺️ *Rota no Google Maps:* ${station2.walkingRouteMapsUrl}`
    );

  assert(
    updatedAfterStationSwitch.includes(customManualNote),
    "Edição manual do usuário deve ser preservada após trocar a estação selecionada"
  );
  assert(
    updatedAfterStationSwitch.includes(station2.name),
    "Nova estação selecionada deve constar na mensagem atualizada"
  );
  assert(
    !updatedAfterStationSwitch.includes("undefined") && !updatedAfterStationSwitch.includes("null"),
    "Mensagem final não pode conter 'undefined' ou 'null'"
  );
  console.log("   [OK] Mensagem gerada, editada manualmente e atualizada com nova estação sem perder edição manual.");
  console.log("   ✅ CENÁRIO D APROVADO!\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO E — Teste de Integração HTTP e Regressão do Sistema
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO E] Integração HTTP (/api/scale-generator/locate) & Regressão Rebuss Ops:");
  const adminUser = await prisma.usuario.findUnique({
    where: { email: "kelvimatosalves@gmail.com" },
  });
  assert(adminUser, "Admin kelvimatosalves@gmail.com deve existir no banco");

  const jwtSecret =
    process.env.JWT_SECRET || "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

  const token = jwt.sign(
    {
      id: adminUser!.id,
      email: adminUser!.email,
      perfil: adminUser!.perfil,
    },
    jwtSecret,
    { expiresIn: "15m" }
  );

  let apiBase = "http://127.0.0.1:3001/api";
  let tempServer: any = null;

  try {
    const probe = await fetch("http://127.0.0.1:3001/api/health", {
      signal: AbortSignal.timeout(1500),
    });
    if (!probe.ok) throw new Error("Server not responding");
  } catch {
    const { default: app } = await import("../server.js");
    await new Promise<void>((resolve) => {
      tempServer = app.listen(0, "127.0.0.1", () => {
        const addr = tempServer.address();
        const port = typeof addr === "object" && addr ? addr.port : 3001;
        apiBase = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  }

  try {
    // 1. Test POST /api/scale-generator/locate via HTTP
    const httpLocateRes = await fetch(`${apiBase}/scale-generator/locate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        input: "St. Sudoeste Comércio Local Sudoeste 6 - Sudoeste, Brasília - DF, 70680-650",
      }),
    });
    assert(httpLocateRes.status === 200, `POST /api/scale-generator/locate retornou ${httpLocateRes.status}`);
    const httpLocateJson = (await httpLocateRes.json()) as any;
    assert(httpLocateJson.success === true, "Resposta HTTP deve ter success = true");
    assert(httpLocateJson.stations.length >= 3, "Endpoint HTTP deve retornar >= 3 estações");
    console.log("   [OK] POST /api/scale-generator/locate autenticado respondeu HTTP 200 com dados válidos.");

    // 2. Test Regression on Fixed Teams (SP, RJ, SJC)
    const teamsRes = await fetch(`${apiBase}/fixed-teams`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(teamsRes.status === 200, "GET /api/fixed-teams deve responder HTTP 200");
    const teamsJson = (await teamsRes.json()) as any;
    const teamsList = Array.isArray(teamsJson)
      ? teamsJson
      : teamsJson.teams || teamsJson.data?.teams || teamsJson.data;
    assert(
      Array.isArray(teamsList) && teamsList.length === 24,
      `Total de equipes fixas deve ser 24 (19 SP + 4 RJ + 1 SJC), obteve ${teamsList?.length}`
    );
    console.log("   [OK] GET /api/fixed-teams verificado: 24 equipes ativas (SP, RJ, SJC) intactas.");

    // 3. Test Regression on Auth / Profile
    const meRes = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(meRes.status === 200, "GET /api/auth/me deve responder HTTP 200");
    console.log("   [OK] GET /api/auth/me verificado: autenticação e perfil intactos.");
    console.log("   ✅ CENÁRIO E APROVADO!\n");
  } finally {
    if (tempServer) {
      tempServer.close();
    }
  }

  // ---------------------------------------------------------------------------
  // CENÁRIO F — Auditoria de Privacidade na Tela de Login
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO F] Auditoria de Privacidade & Segurança na Tela de Login:");
  const fs = await import("fs");
  const path = await import("path");
  const loginFilePath = path.resolve(process.cwd(), "client/src/pages/Login.tsx");
  const loginCode = fs.readFileSync(loginFilePath, "utf8");

  assert(
    !loginCode.includes("kelvimatosalves@gmail.com"),
    "Código da tela de Login NÃO PODE conter e-mail pessoal pré-preenchido ou de demonstração"
  );
  assert(
    loginCode.includes('useState("")'),
    "Os campos de credenciais na tela de Login devem ser inicializados com string vazia"
  );
  assert(
    loginCode.includes("seu.email@empresa.com"),
    "O placeholder do campo de login deve ser genérico e corporativo"
  );
  console.log("   [OK] Nenhum e-mail pessoal exposto no código ou valores padrão da tela de Login.");
  console.log("   ✅ CENÁRIO F APROVADO!\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO G — Detecção e Bloqueio de Divergência de Município (Prevenção de Falsos Positivos)
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO G] Detecção de Divergência entre Cidades (Prevenção de Falsos Positivos):");
  const divergentResult = await scaleGeneratorService.locateAndFindTransit({
    input: "Rua Coronel Souza Franco, 120 - Centro, São Paulo - SP", // Rua de Mogi das Cruzes solicitada com cidade 'São Paulo'
  });

  console.log("   Status de validação:", divergentResult.status);
  console.log("   Divergência detectada:", divergentResult.divergence?.summary);
  assert(
    divergentResult.status === "DIVERGENTE",
    "Endereço com município conflitante deve receber status DIVERGENTE"
  );
  assert(
    divergentResult.divergence?.hasDivergence === true,
    "Divergence details deve reportar hasDivergence = true"
  );
  assert(
    divergentResult.stations.length === 0,
    "Estações de transporte NÃO PODEM ser calculadas enquanto o status for DIVERGENTE"
  );
  assert(
    divergentResult.stationSearchMeta.message?.includes("suspenso") ||
      divergentResult.stationSearchMeta.message?.includes("divergência"),
    "Mensagem de segurança deve indicar suspensão da busca de estações"
  );
  console.log("   [OK] Falso positivo interceptado com sucesso. Estações suspensas até confirmação.");
  console.log("   ✅ CENÁRIO G APROVADO!\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO H — Resolução Generalizada de Endereço em São Paulo (Gustav Klimt / Vila Moraes)
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO H] Resolução Generalizada de Endereço em São Paulo (Gustav Klimt):");
  const addressKlimt = "Rua Gustav Klimt, 88 - Vila Moraes, São Paulo - SP, 04175-010";
  const resH = await scaleGeneratorService.locateAndFindTransit({
    input: addressKlimt,
  });

  console.log("   [Localizado]:", resH.location.formattedAddress);
  console.log(`   [Coordenadas]: ${resH.location.lat.toFixed(5)}, ${resH.location.lon.toFixed(5)}`);
  console.log("   [Município]:", resH.location.city || resH.location.municipio);
  console.log("   [Status]:", resH.status);

  assert(
    resH.status === "CONFIRMADO",
    "Endereço da Rua Gustav Klimt em São Paulo deve ser CONFIRMADO"
  );
  assert(
    resH.location.lat < -23.55 && resH.location.lat > -23.70 &&
      resH.location.lon < -46.55 && resH.location.lon > -46.70,
    `Coordenadas devem apontar para a Zona Sul de São Paulo, obteve ${resH.location.lat}, ${resH.location.lon}`
  );
  assert(
    !resH.location.formattedAddress.toLowerCase().includes("mogi"),
    "Endereço da capital NÃO pode ser atribuído a Mogi das Cruzes"
  );
  assert(
    resH.stations.length >= 3,
    "Deve retornar estações de metrô da região (Ex: Saúde, Praça da Árvore, Conceição, Jabaquara)"
  );

  console.log("   [Estações Retornadas]:");
  for (const st of resH.stations.slice(0, 3)) {
    console.log(`     - ${st.name} [${st.transportLabel}] | Reta: ${st.straightDistanceMeters}m | Caminhada: ${st.walkingDistanceMeters ? `${st.walkingDistanceMeters}m (~${st.walkingDurationMinutes} min)` : "N/D"}`);
    assert(
      !st.name.toLowerCase().includes("estudantes") && !st.name.toLowerCase().includes("mogi"),
      "Estações retornadas devem pertencer à rede da Capital, nunca Mogi das Cruzes"
    );
  }
  console.log("   [OK] Endereço da capital localizado com precisão e estações corretas vinculadas.");
  console.log("   ✅ CENÁRIO H APROVADO!\n");

  // ---------------------------------------------------------------------------
  // CENÁRIO I — Separação Estruturada dos Componentes de Endereço
  // ---------------------------------------------------------------------------
  console.log("-> [CENÁRIO I] Separação Estruturada dos Componentes de Endereço:");
  const testInputComponents = "Avenida Brigadeiro Faria Lima, 3477, Conjunto 101 - Itaim Bibi, São Paulo - SP, 04538-133";
  const resI = await scaleGeneratorService.locateAndFindTransit({
    input: testInputComponents,
  });

  console.log("   [Componentes Extraídos]:", {
    logradouro: resI.parsedInput.logradouro,
    numero: resI.parsedInput.numero,
    complemento: resI.parsedInput.complemento,
    bairro: resI.parsedInput.bairro,
    municipio: resI.parsedInput.municipio,
    uf: resI.parsedInput.uf,
    cep: resI.parsedInput.cep,
  });

  assert(
    resI.parsedInput.numero === "3477",
    `Número deve ser '3477', obteve '${resI.parsedInput.numero}'`
  );
  assert(
    resI.parsedInput.complemento?.toLowerCase().includes("conjunto 101"),
    `Complemento deve conter 'Conjunto 101', obteve '${resI.parsedInput.complemento}'`
  );
  assert(
    resI.parsedInput.cep === "04538-133",
    `CEP deve ser '04538-133', obteve '${resI.parsedInput.cep}'`
  );
  assert(
    resI.parsedInput.uf === "SP",
    `UF deve ser 'SP', obteve '${resI.parsedInput.uf}'`
  );
  assert(
    resI.parsedInput.municipio?.toLowerCase().includes("são paulo") ||
      resI.parsedInput.city?.toLowerCase().includes("são paulo"),
    `Município deve ser 'São Paulo'`
  );
  console.log("   [OK] Logradouro, número, complemento, bairro, município, UF e CEP perfeitamente separados.");
  console.log("   ✅ CENÁRIO I APROVADO!\n");

  await prisma.$disconnect();

  console.log("==========================================================");
  console.log("  TODOS OS CENÁRIOS (A, B, C, D, E, F, G, H, I) APROVADOS!");
  console.log("==========================================================");
}

runTests().catch(async (err) => {
  console.error("\n❌ FALHA NOS TESTES DO GERADOR DE ESCALAS:", err);
  await prisma.$disconnect();
  process.exit(1);
});
