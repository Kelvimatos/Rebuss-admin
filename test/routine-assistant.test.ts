import {
  ROUTINE_STAGES,
  getSaoPauloTime,
  classifyRoutine,
  calculateRoutineProgress,
  getStageExecutionStatus,
  createInitialDayState,
} from "../client/src/services/routine.service.js";
import { RoutineStageId } from "../client/src/types/routine.js";

console.log("\n========================================================");
console.log("  BATERIA DE TESTES DO ASSISTENTE DE ROTINA OPERACIONAL");
console.log("========================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   Detalhe: ${detail}`);
    process.exitCode = 1;
  }
}

// 1. Verificação do fuso horário America/Sao_Paulo
console.log("--- 1. Fuso Horário America/Sao_Paulo ---");
const sp = getSaoPauloTime();
assert(
  typeof sp.dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dateString),
  "Formato da data em America/Sao_Paulo (YYYY-MM-DD)",
  `Recebido: ${sp.dateString}`
);
assert(
  typeof sp.timeString === "string" && /^\d{2}:\d{2}:\d{2}$/.test(sp.timeString),
  "Formato da hora em America/Sao_Paulo (HH:mm:ss)",
  `Recebido: ${sp.timeString}`
);
assert(
  sp.hours >= 0 && sp.hours <= 23 && sp.minutes >= 0 && sp.minutes <= 59,
  "Horas e minutos dentro dos limites válidos",
  `Horas: ${sp.hours}, Minutos: ${sp.minutes}`
);

// 2. Testes de Horários Controlados
console.log("\n--- 2. Classificação de Horários Operacionais ---");

// Estado de simulação com etapas inicialmente pendentes
const freshDayState = createInitialDayState("test-user-1", "2026-10-20");

// 10:59 — Expediente ainda não iniciado
{
  const c = classifyRoutine(10 * 60 + 59, freshDayState.etapas);
  assert(
    c.activeTimeStageId === null && c.statusTexto.includes("Expediente ainda não iniciado"),
    "10:59 — Expediente ainda não iniciado",
    JSON.stringify(c)
  );
  assert(
    c.tempoAteProximaMin === 1,
    "10:59 — Faltando 1 minuto para início da conferência",
    `Minutos restantes: ${c.tempoAteProximaMin}`
  );
}

// 11:00 — Início da conferência
{
  const c = classifyRoutine(11 * 60, freshDayState.etapas);
  assert(
    c.activeTimeStageId === "etapa-1" && c.statusTexto.includes("Conferência de confirmações"),
    "11:00 — Início da Etapa 1 (Conferência de confirmações)",
    JSON.stringify(c)
  );
}

// 13:59 — Etapa de confirmações
{
  const c = classifyRoutine(13 * 60 + 59, freshDayState.etapas);
  assert(
    c.activeTimeStageId === "etapa-1",
    "13:59 — Permanece na Etapa 1 até as 13:59",
    JSON.stringify(c)
  );
}

// 14:00 — Início dos disparos (Prioridade)
{
  const c = classifyRoutine(14 * 60, freshDayState.etapas);
  assert(
    c.activeTimeStageId === "etapa-2" && c.statusTipo === "prioridade",
    "14:00 — Início da Etapa 2 (Disparo das Escalas com prioridade)",
    JSON.stringify(c)
  );
  assert(
    c.etapasAtrasadas.includes("etapa-1"),
    "14:00 — Etapa 1 pendente é detectada como atrasada às 14h",
    JSON.stringify(c.etapasAtrasadas)
  );
}

// 16:00 — Janela dos disparos encerrada
{
  // Caso A: Etapa 2 não concluída às 16:00
  const cPending = classifyRoutine(16 * 60, freshDayState.etapas);
  assert(
    cPending.statusTexto.includes("Disparos pendentes"),
    "16:00 (sem concluir Etapa 2) — Exibe alerta de disparos pendentes",
    cPending.statusTexto
  );
  assert(
    cPending.etapasAtrasadas.includes("etapa-2"),
    "16:00 — Etapa 2 marcada como atrasada",
    JSON.stringify(cPending.etapasAtrasadas)
  );

  // Caso B: Etapa 2 concluída às 16:00
  const stateWithE2Done = {
    ...freshDayState.etapas,
    "etapa-2": { concluida: true, concluidaEm: new Date().toISOString(), checklist: {} },
  };
  const cDone = classifyRoutine(16 * 60, stateWithE2Done);
  assert(
    cDone.statusTexto.includes("Preparação para Acompanhamento"),
    "16:00 (com Etapa 2 concluída) — Exibe preparação para acompanhamento",
    cDone.statusTexto
  );
}

// 17:00 — Acompanhamento das equipes
{
  const c = classifyRoutine(17 * 60, freshDayState.etapas);
  assert(
    c.activeTimeStageId === "etapa-3" && c.statusTexto.includes("Acompanhamento das equipes"),
    "17:00 — Início da Etapa 3 (Acompanhamento das equipes)",
    JSON.stringify(c)
  );
}

// 20:29 — Etapa de acompanhamento
{
  const c = classifyRoutine(20 * 60 + 29, freshDayState.etapas);
  assert(
    c.activeTimeStageId === "etapa-3",
    "20:29 — Permanece na Etapa 3 até 20:29",
    JSON.stringify(c)
  );
}

// 20:30 — Conferência de pessoas em loja
{
  const c = classifyRoutine(20 * 60 + 30, freshDayState.etapas);
  assert(
    c.activeTimeStageId === "etapa-4" && c.statusTipo === "prioridade",
    "20:30 — Início da Etapa 4 (Conferência de pessoas em loja com prioridade)",
    JSON.stringify(c)
  );
}

// 21:00 — Fechamento e pendências
{
  const c = classifyRoutine(21 * 60, freshDayState.etapas);
  assert(
    c.statusTipo === "fechamento" && c.statusTexto.includes("Fechamento da rotina diária"),
    "21:00 — Fechamento da rotina diária",
    JSON.stringify(c)
  );
}

// 3. Testes de Checklist e Progresso
console.log("\n--- 3. Checklist e Cálculo de Progresso ---");
{
  const day = createInitialDayState("user-1", "2026-10-20");
  const p0 = calculateRoutineProgress(day);
  assert(p0.porcentagemChecklist === 0 && p0.etapasConcluidasCount === 0, "Progresso inicial é 0%");

  // Marca 2 itens da etapa 1
  day.etapas["etapa-1"].checklist[0] = true;
  day.etapas["etapa-1"].checklist[1] = true;
  const p1 = calculateRoutineProgress(day);
  assert(
    p1.itensConcluidos === 2 && p1.porcentagemChecklist > 0,
    `Progresso com 2 itens marcados: ${p1.porcentagemChecklist}% (${p1.itensConcluidos}/${p1.totalItens})`
  );

  // Conclui etapa 1
  day.etapas["etapa-1"].concluida = true;
  const p2 = calculateRoutineProgress(day);
  assert(
    p2.etapasConcluidasCount === 1 && p2.porcentagemEtapas === 25,
    "1 de 4 etapas concluída representa 25% de etapas"
  );
}

// 4. Testes de Virada do Dia e Isolamento
console.log("\n--- 4. Virada do Dia e Isolamento de Usuários ---");
{
  const day1 = createInitialDayState("user-A", "2026-10-20");
  day1.etapas["etapa-1"].concluida = true;

  const day2 = createInitialDayState("user-A", "2026-10-21");
  assert(
    day2.data === "2026-10-21" && day2.etapas["etapa-1"].concluida === false,
    "Novo dia (2026-10-21) inicia limpo sem misturar checklist do dia anterior"
  );

  const dayUserB = createInitialDayState("user-B", "2026-10-20");
  assert(
    dayUserB.userId === "user-B" && dayUserB.etapas["etapa-1"].concluida === false,
    "Usuário B tem estado isolado do Usuário A"
  );
}

console.log("\n========================================================");
console.log(`  RESUMO: ${passedTests} de ${totalTests} testes aprovados!`);
console.log("========================================================\n");

if (passedTests === totalTests) {
  console.log("🎉 TODOS OS TESTES DO ASSISTENTE DE ROTINA APROVADOS!");
} else {
  process.exit(1);
}
