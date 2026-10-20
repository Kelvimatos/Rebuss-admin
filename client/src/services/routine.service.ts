import {
  RoutineStageConfig,
  RoutineStageId,
  RoutineDayState,
  RoutineCurrentClassification,
  StageExecutionStatus,
} from "../types/routine.js";

// ============================================================================
// 1. CONFIGURAÇÃO OFICIAL DAS 4 ETAPAS DA ROTINA OPERACIONAL
// ============================================================================
export const ROUTINE_STAGES: RoutineStageConfig[] = [
  {
    id: "etapa-1",
    numero: 1,
    nome: "Conferência de Confirmações",
    tituloCurto: "Conferindo confirmações",
    horarioInicioMin: 11 * 60, // 11:00 (660 min)
    horarioFimMin: 14 * 60,    // 14:00 (840 min)
    horarioExibicao: "11:00",
    objetivo: "Comece o dia verificando as confirmações das equipes e dos colaboradores.",
    descricao:
      "Iniciar o expediente operacional coletando confirmações das equipes, validando presenças e mapeando pendências.",
    checklistPadrao: [
      "Iniciar conferência das confirmações",
      "Verificar quem confirmou presença",
      "Identificar pendências",
      "Atualizar o status das equipes",
    ],
    acaoPrincipal: {
      texto: "Iniciar conferência",
      rota: "/tools/equipes-fixas",
      tooltip: "Abrir painel de Equipes Fixas para conferência",
    },
    prioridade: false,
  },
  {
    id: "etapa-2",
    numero: 2,
    nome: "Disparo das Escalas",
    tituloCurto: "Disparo de escalas",
    horarioInicioMin: 14 * 60, // 14:00 (840 min)
    horarioFimMin: 16 * 60,    // 16:00 (960 min)
    horarioExibicao: "14:00–16:00",
    objetivo: "Hora de preparar e disparar as escalas do próximo plantão.",
    descricao:
      "Janela crítica com prioridade operacional ativa das 14h às 16h para conferência e envio das escalas de atendimento.",
    checklistPadrao: [
      "Conferir lojas e operações",
      "Verificar os nomes dos colaboradores",
      "Conferir horários, endereços e pontos de encontro",
      "Realizar o disparo das escalas",
      "Confirmar que os envios foram concluídos",
    ],
    acaoPrincipal: {
      texto: "Iniciar disparos",
      rota: "/tools",
      tooltip: "Acessar ferramentas operacionais de disparo",
    },
    prioridade: true,
  },
  {
    id: "etapa-3",
    numero: 3,
    nome: "Confirmação de Deslocamento",
    tituloCurto: "Acompanhando equipes",
    horarioInicioMin: 17 * 60, // 17:00 (1020 min)
    horarioFimMin: 20 * 60 + 30, // 20:30 (1230 min)
    horarioExibicao: "17:00",
    objetivo: "Entre em contato com as equipes e confirme se todos estão a caminho.",
    descricao:
      "Acompanhar o deslocamento das equipes escaladas, checar respostas e antecipar soluções para atrasos ou imprevistos.",
    checklistPadrao: [
      "Identificar as equipes escaladas",
      "Enviar a mensagem de acompanhamento",
      "Verificar respostas",
      "Identificar possíveis atrasos ou problemas",
    ],
    acaoPrincipal: {
      texto: "Acompanhar equipes",
      rota: "/tools/equipes-fixas",
      tooltip: "Consultar supervisores e equipes em trânsito",
    },
    prioridade: false,
  },
  {
    id: "etapa-4",
    numero: 4,
    nome: "Conferência de Pessoas em Loja",
    tituloCurto: "Pessoas em loja",
    horarioInicioMin: 20 * 60 + 30, // 20:30 (1230 min)
    horarioFimMin: 21 * 60,         // 21:00 (1260 min)
    horarioExibicao: "20:30–21:00",
    objetivo: "Faça a conferência de quem já está em loja e identifique as pendências.",
    descricao:
      "Conferência presencial nas lojas, consolidação das presenças em posto e registro final das pendências no sistema.",
    checklistPadrao: [
      "Solicitar ou consultar as confirmações de chegada",
      "Conferir quem já está em loja",
      "Identificar pessoas ainda pendentes",
      "Atualizar as informações no sistema",
    ],
    acaoPrincipal: {
      texto: "Conferir pessoas em loja",
      rota: "/tools/equipes-fixas",
      tooltip: "Checar postos e presença de integrantes",
    },
    prioridade: true,
  },
];

// ============================================================================
// 2. CÁLCULO ESTRITO DE HORÁRIO EM AMERICA/SAO_PAULO
// ============================================================================
export interface SaoPauloTime {
  date: Date;
  dateString: string; // "YYYY-MM-DD"
  timeString: string; // "HH:mm:ss"
  timeShortString: string; // "HH:mm"
  hours: number;
  minutes: number;
  seconds: number;
  minutesSinceMidnight: number;
}

export function getSaoPauloTime(baseDate: Date = new Date()): SaoPauloTime {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(baseDate);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "0";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hourStr = getPart("hour");
  const minuteStr = getPart("minute");
  const secondStr = getPart("second");

  const hours = parseInt(hourStr === "24" ? "00" : hourStr, 10);
  const minutes = parseInt(minuteStr, 10);
  const seconds = parseInt(secondStr, 10);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const timeShortString = `${pad(hours)}:${pad(minutes)}`;
  const dateString = `${year}-${month}-${day}`;
  const minutesSinceMidnight = hours * 60 + minutes;

  return {
    date: baseDate,
    dateString,
    timeString,
    timeShortString,
    hours,
    minutes,
    seconds,
    minutesSinceMidnight,
  };
}

// ============================================================================
// 3. CLASSIFICAÇÃO AUTOMÁTICA DA ETAPA CONFORME REGRAS DE NEGÓCIO
// ============================================================================
export function classifyRoutine(
  minutesSinceMidnight: number,
  stagesState: Record<RoutineStageId, { concluida: boolean }>
): RoutineCurrentClassification {
  let activeTimeStageId: RoutineStageId | null = null;
  let statusTexto = "";
  let statusTipo: RoutineCurrentClassification["statusTipo"] = "ativo";
  let proximaTarefa = "";
  let tempoAteProximaMin = 0;
  let horarioProximaFormatado = "";

  // 1. Antes das 11h (< 660 min)
  if (minutesSinceMidnight < 660) {
    activeTimeStageId = null;
    statusTexto = "Expediente ainda não iniciado";
    statusTipo = "fora_expediente";
    proximaTarefa = "Conferência de Confirmações (11:00)";
    tempoAteProximaMin = 660 - minutesSinceMidnight;
    horarioProximaFormatado = "11:00";
  }
  // 2. Das 11h às 13h59 (660 <= min < 840)
  else if (minutesSinceMidnight >= 660 && minutesSinceMidnight < 840) {
    activeTimeStageId = "etapa-1";
    statusTexto = "Conferência de confirmações";
    statusTipo = "ativo";
    proximaTarefa = "Disparo das Escalas (14:00)";
    tempoAteProximaMin = 840 - minutesSinceMidnight;
    horarioProximaFormatado = "14:00";
  }
  // 3. Das 14h às 15h59 (840 <= min < 960)
  else if (minutesSinceMidnight >= 840 && minutesSinceMidnight < 960) {
    activeTimeStageId = "etapa-2";
    statusTexto = "Disparo das escalas (Prioridade)";
    statusTipo = "prioridade";
    proximaTarefa = "Acompanhamento das Equipes (17:00)";
    tempoAteProximaMin = 1020 - minutesSinceMidnight;
    horarioProximaFormatado = "17:00";
  }
  // 4. Das 16h às 16h59 (960 <= min < 1020)
  else if (minutesSinceMidnight >= 960 && minutesSinceMidnight < 1020) {
    const etapa2Concluida = stagesState["etapa-2"]?.concluida;
    activeTimeStageId = null;
    if (etapa2Concluida) {
      statusTexto = "Preparação para Acompanhamento das Equipes";
      statusTipo = "transicao";
    } else {
      statusTexto = "Disparos pendentes (Atenção)";
      statusTipo = "prioridade";
    }
    proximaTarefa = "Acompanhamento das Equipes (17:00)";
    tempoAteProximaMin = 1020 - minutesSinceMidnight;
    horarioProximaFormatado = "17:00";
  }
  // 5. Das 17h às 20h29 (1020 <= min < 1230)
  else if (minutesSinceMidnight >= 1020 && minutesSinceMidnight < 1230) {
    activeTimeStageId = "etapa-3";
    statusTexto = "Acompanhamento das equipes";
    statusTipo = "ativo";
    proximaTarefa = "Conferência de Pessoas em Loja (20:30)";
    tempoAteProximaMin = 1230 - minutesSinceMidnight;
    horarioProximaFormatado = "20:30";
  }
  // 6. Das 20h30 às 20h59 (1230 <= min < 1260)
  else if (minutesSinceMidnight >= 1230 && minutesSinceMidnight < 1260) {
    activeTimeStageId = "etapa-4";
    statusTexto = "Conferência de pessoas em loja (Prioridade)";
    statusTipo = "prioridade";
    proximaTarefa = "Fechamento da Rotina (21:00)";
    tempoAteProximaMin = 1260 - minutesSinceMidnight;
    horarioProximaFormatado = "21:00";
  }
  // 7. A partir das 21h (>= 1260 min)
  else {
    activeTimeStageId = null;
    statusTexto = "Fechamento da rotina diária";
    statusTipo = "fechamento";
    proximaTarefa = "Início do próximo expediente (Amanhã às 11:00)";
    tempoAteProximaMin = 24 * 60 - minutesSinceMidnight + 660;
    horarioProximaFormatado = "11:00 (+1d)";
  }

  // Identificação de etapas atrasadas
  // Não considere uma tarefa concluída simplesmente porque seu horário passou.
  const etapasAtrasadas: RoutineStageId[] = [];

  // Etapa 1 vence às 14:00 (840)
  if (minutesSinceMidnight >= 840 && !stagesState["etapa-1"]?.concluida) {
    etapasAtrasadas.push("etapa-1");
  }
  // Etapa 2 vence às 16:00 (960)
  if (minutesSinceMidnight >= 960 && !stagesState["etapa-2"]?.concluida) {
    etapasAtrasadas.push("etapa-2");
  }
  // Etapa 3 vence às 20:30 (1230)
  if (minutesSinceMidnight >= 1230 && !stagesState["etapa-3"]?.concluida) {
    etapasAtrasadas.push("etapa-3");
  }
  // Etapa 4 vence às 21:00 (1260)
  if (minutesSinceMidnight >= 1260 && !stagesState["etapa-4"]?.concluida) {
    etapasAtrasadas.push("etapa-4");
  }

  const todasConcluidas =
    Boolean(stagesState["etapa-1"]?.concluida) &&
    Boolean(stagesState["etapa-2"]?.concluida) &&
    Boolean(stagesState["etapa-3"]?.concluida) &&
    Boolean(stagesState["etapa-4"]?.concluida);

  // Seleciona a etapa default exibida no painel
  // Dá preferência para a etapa ativa no relógio ou para a primeira atrasada
  let selectedStageId: RoutineStageId = "etapa-1";
  if (activeTimeStageId) {
    selectedStageId = activeTimeStageId;
  } else if (etapasAtrasadas.length > 0) {
    selectedStageId = etapasAtrasadas[0];
  } else if (minutesSinceMidnight >= 1260) {
    selectedStageId = "etapa-4";
  }

  return {
    activeTimeStageId,
    selectedStageId,
    statusTexto,
    statusTipo,
    proximaTarefa,
    tempoAteProximaMin,
    horarioProximaFormatado,
    etapasAtrasadas,
    todasConcluidas,
  };
}

// ============================================================================
// 4. CÁLCULO DE STATUS INDIVIDUAL POR ETAPA
// ============================================================================
export function getStageExecutionStatus(
  stageId: RoutineStageId,
  minutesSinceMidnight: number,
  stageProgress: { concluida: boolean; checklist: Record<number, boolean> }
): StageExecutionStatus {
  if (stageProgress.concluida) {
    return "concluida";
  }

  const stage = ROUTINE_STAGES.find((s) => s.id === stageId)!;

  // Atrasada se já passou da janela de término e ainda não foi concluída
  if (minutesSinceMidnight >= stage.horarioFimMin) {
    return "atrasada";
  }

  // Em andamento se está dentro da janela ou se algum checklist foi iniciado
  const hasCheckedItems = Object.values(stageProgress.checklist).some(Boolean);
  if (minutesSinceMidnight >= stage.horarioInicioMin || hasCheckedItems) {
    return "em_andamento";
  }

  return "nao_iniciada";
}

// ============================================================================
// 5. CÁLCULO DE PROGRESSO GERAL DO DIA
// ============================================================================
export function calculateRoutineProgress(
  dayState: RoutineDayState
): {
  porcentagemChecklist: number;
  itensConcluidos: number;
  totalItens: number;
  etapasConcluidasCount: number;
  totalEtapas: number;
  porcentagemEtapas: number;
} {
  let totalItens = 0;
  let itensConcluidos = 0;
  let etapasConcluidasCount = 0;

  ROUTINE_STAGES.forEach((stage) => {
    const stageState = dayState.etapas[stage.id];
    if (stageState?.concluida) {
      etapasConcluidasCount += 1;
    }

    stage.checklistPadrao.forEach((_, idx) => {
      totalItens += 1;
      if (stageState?.checklist[idx]) {
        itensConcluidos += 1;
      }
    });
  });

  const porcentagemChecklist =
    totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0;
  const porcentagemEtapas = Math.round(
    (etapasConcluidasCount / ROUTINE_STAGES.length) * 100
  );

  return {
    porcentagemChecklist,
    itensConcluidos,
    totalItens,
    etapasConcluidasCount,
    totalEtapas: ROUTINE_STAGES.length,
    porcentagemEtapas,
  };
}

// ============================================================================
// 6. PERSISTÊNCIA ISOLADA POR USUÁRIO E DATA EM AMERICA/SAO_PAULO
// ============================================================================
export function getStorageKey(userId: string, dateSP: string): string {
  const safeUser = userId || "anonymous";
  return `rebuss_routine_state_${safeUser}_${dateSP}`;
}

export function getHistoryKey(userId: string): string {
  const safeUser = userId || "anonymous";
  return `rebuss_routine_history_${safeUser}`;
}

export function createInitialDayState(userId: string, dateSP: string): RoutineDayState {
  const etapas: Record<RoutineStageId, { concluida: boolean; concluidaEm: string | null; checklist: Record<number, boolean> }> = {
    "etapa-1": { concluida: false, concluidaEm: null, checklist: {} },
    "etapa-2": { concluida: false, concluidaEm: null, checklist: {} },
    "etapa-3": { concluida: false, concluidaEm: null, checklist: {} },
    "etapa-4": { concluida: false, concluidaEm: null, checklist: {} },
  };

  return {
    data: dateSP,
    userId: userId || "anonymous",
    etapas,
    ultimaAtualizacao: new Date().toISOString(),
  };
}

export function loadDayState(userId: string, dateSP: string): RoutineDayState {
  try {
    const key = getStorageKey(userId, dateSP);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data === dateSP && parsed.etapas) {
        return parsed;
      }
    }
  } catch {
    // fallback seguro
  }

  const newState = createInitialDayState(userId, dateSP);
  saveDayState(newState);
  return newState;
}

export function saveDayState(state: RoutineDayState): void {
  try {
    const key = getStorageKey(state.userId, state.data);
    state.ultimaAtualizacao = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(state));

    // Registra na lista de histórico de datas do usuário
    const histKey = getHistoryKey(state.userId);
    const historyRaw = localStorage.getItem(histKey);
    let history: string[] = [];
    if (historyRaw) {
      try {
        history = JSON.parse(historyRaw);
      } catch {}
    }
    if (!history.includes(state.data)) {
      history.push(state.data);
      // Mantém histórico ordenado
      history.sort();
      localStorage.setItem(histKey, JSON.stringify(history));
    }
  } catch (err) {
    console.warn("[Routine Service] Falha ao salvar rotina em localStorage:", err);
  }
}

// Formatação humanizada de contagem regressiva
export function formatMinutesRemaining(minutes: number): string {
  if (minutes <= 0) return "Agora";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}
