/**
 * REBUSS OPS — Suíte de Testes Automatizados do Robô de Atendimento Operacional
 * 
 * Valida:
 * 1. Classificação das respostas (Casos mínimos do item 9 e casos extremos de negação)
 * 2. Prioridade absoluta de recusa sobre palavras de confirmação
 * 3. Limites de palavras (evitar falso positivo em "assim", "simples", etc.)
 * 4. Saudações adaptadas ao horário de São Paulo
 * 5. Tratamento de mensagens repetidas e mudança de ideia (transição de status e histórico)
 * 6. Desambiguação de múltiplas operações
 * 7. Blindagem contra grupos e mensagens do próprio robô
 * 8. Relatórios de escala por loja e resumo geral
 */

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const {
  ClassificationTypes,
  classifyResponse,
  isGreeting,
  normalizeText,
} = require("../services/responseClassifier");
const {
  AttendanceStatus,
  AttendanceService,
  normalizePhoneNumber,
  phonesMatch,
} = require("../services/attendanceService");
const { ReportService } = require("../services/reportService");
const config = require("../config");

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } catch (error) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Erro: ${error.message}`);
  }
}

console.log("\n=======================================================");
console.log("🧪 INICIANDO TESTES DO ROBÔ OPERACIONAL REBUSS OPS");
console.log("=======================================================\n");

// =====================================================================
// 1. TESTES DA TABELA MÍNIMA OBRIGATÓRIA (ITEM 9 DO REQUISITO)
// =====================================================================
console.log("--- 1. Casos Mínimos Obrigatórios de Classificação ---");

const requiredCases = [
  { msg: "Sim", expected: ClassificationTypes.CONFIRMADO },
  { msg: "OK", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Confirmo", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Confirmado!", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Não", expected: ClassificationTypes.RECUSADO },
  { msg: "Não confirmo", expected: ClassificationTypes.RECUSADO },
  { msg: "Não vou", expected: ClassificationTypes.RECUSADO },
  { msg: "NAO POSSO", expected: ClassificationTypes.RECUSADO },
  { msg: "Talvez", expected: ClassificationTypes.INDEFINIDO },
  { msg: "Vou ver", expected: ClassificationTypes.INDEFINIDO },
  { msg: "Acho que sim", expected: ClassificationTypes.INDEFINIDO },
  { msg: "Não sei ainda", expected: ClassificationTypes.INDEFINIDO },
];

requiredCases.forEach(({ msg, expected }) => {
  runTest(`Classificação: "${msg}" -> ${expected}`, () => {
    const res = classifyResponse(msg, { isWaitingForAttendance: true });
    assert.strictEqual(
      res.type,
      expected,
      `Esperado: ${expected}, Obtido: ${res.type} para texto "${msg}"`
    );
  });
});

// =====================================================================
// 2. TESTES DE REGRA CRÍTICA: PRIORIDADE DE RECUSA
// =====================================================================
console.log("\n--- 2. Regra Crítica: Prioridade Absoluta de Negação ---");

const negativePriorityCases = [
  { msg: "Não confirmo a presença", expected: ClassificationTypes.RECUSADO },
  { msg: "Infelizmente não vou poder ir", expected: ClassificationTypes.RECUSADO },
  { msg: "Não vou conseguir comparecer", expected: ClassificationTypes.RECUSADO },
  { msg: "Não vai dar para ir hoje", expected: ClassificationTypes.RECUSADO },
  { msg: "Não poderei ir, me desculpe", expected: ClassificationTypes.RECUSADO },
  { msg: "Não confirmo! Vou em outro evento", expected: ClassificationTypes.RECUSADO },
  { msg: "Nem pensar", expected: ClassificationTypes.RECUSADO },
  { msg: "Sem chance", expected: ClassificationTypes.RECUSADO },
  { msg: "Impossível comparecer", expected: ClassificationTypes.RECUSADO },
];

negativePriorityCases.forEach(({ msg, expected }) => {
  runTest(`Prioridade de Recusa: "${msg}" -> ${expected}`, () => {
    const res = classifyResponse(msg, { isWaitingForAttendance: true });
    assert.strictEqual(
      res.type,
      expected,
      `Recusa deve ter prioridade sobre palavras de confirmação. Obtido: ${res.type}`
    );
  });
});

// =====================================================================
// 3. TESTES DE VARIAÇÕES POSITIVAS E LIMITES DE PALAVRA
// =====================================================================
console.log("\n--- 3. Variações de Confirmação e Limites de Palavra ---");

const affirmativeVariations = [
  { msg: "Vou sim!", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Estarei lá", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Estarei la", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Pode contar comigo", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Conte comigo!", expected: ClassificationTypes.CONFIRMADO },
  { msg: "ok!!", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Confirmada", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Positivo", expected: ClassificationTypes.CONFIRMADO },
  { msg: "Com certeza vou", expected: ClassificationTypes.CONFIRMADO },
];

affirmativeVariations.forEach(({ msg, expected }) => {
  runTest(`Confirmação aceita: "${msg}" -> ${expected}`, () => {
    const res = classifyResponse(msg, { isWaitingForAttendance: true });
    assert.strictEqual(res.type, expected);
  });
});

// Testes para garantir que substrings não causem falsos positivos
const boundaryCases = [
  { msg: "assim que der", notExpected: ClassificationTypes.CONFIRMADO },
  { msg: "simplesmente", notExpected: ClassificationTypes.CONFIRMADO },
  { msg: "estou aqui", notExpected: ClassificationTypes.CONFIRMADO },
  { msg: "bloco de notas", notExpected: ClassificationTypes.CONFIRMADO },
];

boundaryCases.forEach(({ msg, notExpected }) => {
  runTest(`Limite de palavras (evita falso positivo): "${msg}" não é ${notExpected}`, () => {
    const res = classifyResponse(msg, { isWaitingForAttendance: false });
    assert.notStrictEqual(res.type, notExpected);
  });
});

// =====================================================================
// 4. TESTES DE SAUDAÇÕES E HORÁRIO DE SÃO PAULO
// =====================================================================
console.log("\n--- 4. Saudações e Fuso Horário de São Paulo ---");

runTest("Detecção de saudações comuns", () => {
  assert.strictEqual(isGreeting("Oi"), true);
  assert.strictEqual(isGreeting("Olá!"), true);
  assert.strictEqual(isGreeting("Bom dia"), true);
  assert.strictEqual(isGreeting("Boa tarde!"), true);
  assert.strictEqual(isGreeting("Boa noite"), true);
  assert.strictEqual(isGreeting("Tudo bem?"), true);
  assert.strictEqual(isGreeting("Tem alguém aí?"), true);
  assert.strictEqual(isGreeting("Tem alguem ai"), true);
});

runTest("Adaptação de saudação: Manhã (09h00 SP)", () => {
  const dateManha = new Date("2026-10-19T12:00:00Z"); // 09h00 em SP (UTC-3)
  const greeting = config.getTimeBasedGreeting(dateManha);
  assert.strictEqual(greeting, config.messages.morningGreeting);
});

runTest("Adaptação de saudação: Tarde (15h00 SP)", () => {
  const dateTarde = new Date("2026-10-19T18:00:00Z"); // 15h00 em SP (UTC-3)
  const greeting = config.getTimeBasedGreeting(dateTarde);
  assert.strictEqual(greeting, config.messages.afternoonGreeting);
});

runTest("Adaptação de saudação: Noite (20h00 SP)", () => {
  const dateNoite = new Date("2026-10-19T23:00:00Z"); // 20h00 em SP (UTC-3)
  const greeting = config.getTimeBasedGreeting(dateNoite);
  assert.strictEqual(greeting, config.messages.nightGreeting);
});

// =====================================================================
// 5. TESTES DE RESPOSTAS REPETIDAS E HISTÓRICO DE ALTERAÇÃO
// =====================================================================
console.log("\n--- 5. Respostas Repetidas e Mudança de Ideia (Histórico) ---");

const testStoragePath = path.resolve(__dirname, "../../data/test-scales-store.json");
if (fs.existsSync(testStoragePath)) fs.unlinkSync(testStoragePath);

const attendanceService = new AttendanceService(testStoragePath);

runTest("Atualização inicial de presença: PENDENTE -> CONFIRMADO", () => {
  const scales = attendanceService.getAllScales();
  const escala = scales[0];
  const posto = escala.postos.find((p) => p.status === AttendanceStatus.PENDENTE);
  assert.ok(posto, "Deve existir um posto pendente para teste");

  const result = attendanceService.updateAttendanceStatus(
    escala.id,
    posto.id,
    AttendanceStatus.CONFIRMADO,
    { rawText: "Sim, confirmo", messageId: "msg-001" }
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.updated, true);
  assert.strictEqual(result.previousStatus, AttendanceStatus.PENDENTE);
  assert.strictEqual(result.newStatus, AttendanceStatus.CONFIRMADO);
  assert.strictEqual(result.post.status, AttendanceStatus.CONFIRMADO);
  assert.ok(result.post.confirmadoEm, "Data de confirmação deve ser registrada");
});

runTest("Resposta repetida idêntica: não duplica contagem nem altera status", () => {
  const scales = attendanceService.getAllScales();
  const escala = scales[0];
  const posto = escala.postos[0]; // Já confirmado

  const result = attendanceService.updateAttendanceStatus(
    escala.id,
    posto.id,
    AttendanceStatus.CONFIRMADO,
    { rawText: "Confirmado novamente", messageId: "msg-002" }
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.updated, false, "updated deve ser false em repetições");
  assert.strictEqual(result.newStatus, AttendanceStatus.CONFIRMADO);
  // Confere se registrou evento no histórico sem criar novo posto
  const historico = result.post.historico || [];
  const repEvent = historico.find((h) => h.evento === "REPETICAO_RESPOSTA");
  assert.ok(repEvent, "Evento de repetição deve ser registrado no histórico");
});

runTest("Mudança de ideia do colaborador: CONFIRMADO -> RECUSADO com histórico", () => {
  const scales = attendanceService.getAllScales();
  const escala = scales[0];
  const posto = escala.postos[0];

  const result = attendanceService.updateAttendanceStatus(
    escala.id,
    posto.id,
    AttendanceStatus.RECUSADO,
    { rawText: "Infelizmente não vou poder ir mais", messageId: "msg-003" }
  );

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.updated, true);
  assert.strictEqual(result.previousStatus, AttendanceStatus.CONFIRMADO);
  assert.strictEqual(result.newStatus, AttendanceStatus.RECUSADO);
  assert.strictEqual(result.post.status, AttendanceStatus.RECUSADO);

  const transEvent = result.post.historico.find(
    (h) => h.evento === "TRANSICAO_STATUS" && h.statusAnterior === AttendanceStatus.CONFIRMADO
  );
  assert.ok(transEvent, "Transição de status deve constar no histórico de auditoria");
});

// =====================================================================
// 6. TESTES DE MÚLTIPLAS ESCALAS E DESAMBIGUAÇÃO
// =====================================================================
console.log("\n--- 6. Múltiplas Escalas e Desambiguação ---");

runTest("Identificação de colaborador com múltiplas escalas pendentes", () => {
  // Juliana Santos (5511999994444) está cadastrada em duas lojas diferentes
  const phone = "5511999994444";
  const pendentes = attendanceService.findPendingScalesByPhone(phone);
  assert.strictEqual(
    pendentes.length,
    2,
    "Juliana Santos deve ter 2 escalas pendentes no seed inicial"
  );
});

runTest("Fluxo de sessão de desambiguação", () => {
  const phone = "5511999994444";
  const pendentes = attendanceService.findPendingScalesByPhone(phone);

  // Inicia sessão de escolha
  attendanceService.setDisambiguationSession(phone, pendentes, AttendanceStatus.CONFIRMADO);
  const session = attendanceService.getDisambiguationSession(phone);

  assert.ok(session);
  assert.strictEqual(session.step, "DISAMBIGUATION");
  assert.strictEqual(session.escalas.length, 2);
  assert.strictEqual(session.pendingIntention, AttendanceStatus.CONFIRMADO);

  // Limpa sessão após resposta
  attendanceService.clearSession(phone);
  assert.strictEqual(attendanceService.getDisambiguationSession(phone), null);
});

// =====================================================================
// 7. TESTES DE BLINDAGEM (GRUPOS E MENSAGENS PRÓPRIAS)
// =====================================================================
console.log("\n--- 7. Blindagem contra Grupos e Mensagens Próprias ---");

runTest("Filtro de formato de grupos (@g.us)", () => {
  const groupJid = "120363025489654123@g.us";
  const isGroup = groupJid.endsWith("@g.us");
  assert.strictEqual(isGroup, true, "JIDs terminados em @g.us devem ser identificados como grupo");
});

runTest("Filtro de formato de chat privado (@c.us)", () => {
  const privateJid = "5511999991111@c.us";
  const isPrivate = !privateJid.endsWith("@g.us");
  assert.strictEqual(isPrivate, true, "JIDs terminados em @c.us devem ser tratados como privado");
});

runTest("Normalização de telefones variados", () => {
  assert.strictEqual(normalizePhoneNumber("5511999998888@c.us"), "5511999998888");
  assert.strictEqual(normalizePhoneNumber("(11) 99999-8888"), "5511999998888");
  assert.strictEqual(normalizePhoneNumber("11999998888"), "5511999998888");
  assert.strictEqual(phonesMatch("5511999998888", "(11) 99999-8888"), true);
});

// =====================================================================
// 8. TESTES DE RELATÓRIO OPERACIONAL CONSOLIDADO
// =====================================================================
console.log("\n--- 8. Cálculo e Formatação de Relatórios Operacionais ---");

const reportService = new ReportService(attendanceService);

runTest("Cálculo correto de métricas por loja e resumo geral", () => {
  const report = reportService.generateReport();

  assert.ok(report.lojas.length > 0, "Deve conter lojas no relatório");
  assert.ok(report.resumoGeral.totalLojas > 0, "Total de lojas deve ser > 0");
  assert.ok(report.resumoGeral.postosNecessarios > 0, "Postos necessários deve ser > 0");

  for (const loja of report.lojas) {
    assert.strictEqual(
      loja.confirmados + loja.recusados + loja.pendentes,
      loja.postosPreenchidos,
      `A soma dos status deve bater com os postos preenchidos na loja ${loja.loja}`
    );
    assert.strictEqual(
      loja.semColaborador,
      Math.max(0, loja.postosNecessarios - loja.postosPreenchidos),
      "Sem colaborador = necessários - preenchidos"
    );
    assert.ok(
      loja.percentualConfirmacao >= 0 && loja.percentualConfirmacao <= 100,
      "Percentual deve estar entre 0 e 100"
    );
  }

  const formatted = reportService.formatTextReport(report);
  assert.ok(formatted.includes("RELATÓRIO DE ESCALAS"), "Deve conter cabeçalho do relatório");
  assert.ok(formatted.includes("RESUMO GERAL"), "Deve conter seção de resumo geral");
  assert.ok(formatted.includes("Postos necessários"), "Deve conter detalhamento de postos");
  assert.ok(formatted.includes("Confirmados"), "Deve conter confirmados");
});

// Limpeza de arquivo de teste temporário
try {
  if (fs.existsSync(testStoragePath)) fs.unlinkSync(testStoragePath);
} catch {}

// =====================================================================
// RESULTADO FINAL
// =====================================================================
console.log("\n=======================================================");
console.log(`🏁 RESULTADO DOS TESTES: ${passedTests}/${totalTests} PASSARAM`);
if (passedTests === totalTests) {
  console.log("🎉 TODOS OS TESTES PASSARAM COM SUCESSO!");
} else {
  console.log(`⚠️ ATENÇÃO: ${totalTests - passedTests} testes falharam.`);
}
console.log("=======================================================\n");

process.exit(passedTests === totalTests ? 0 : 1);

