/**
 * REBUSS OPS — Configuração e Inicialização do Cliente WhatsApp
 * 
 * Utiliza whatsapp-web.js com persistência de sessão por LocalAuth,
 * exibição de QR Code no terminal e reconexão controlada.
 */

const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const config = require("../config");
const { MessageHandler } = require("../handlers/messageHandler");
const { AttendanceService } = require("../services/attendanceService");
const { ReportService } = require("../services/reportService");

function createWhatsAppClient(options = {}) {
  const attendanceService = options.attendanceService || new AttendanceService();
  const reportService = options.reportService || new ReportService(attendanceService);

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.sessionPath,
    }),
    puppeteer: config.puppeteer,
  });

  const messageHandler = new MessageHandler({
    client,
    attendanceService,
    reportService,
  });

  // Evento: Geração do QR Code para autenticação
  client.on("qr", (qr) => {
    console.log("\n=======================================================");
    console.log("📲 ESCANEIE O QR CODE ABAIXO COM SEU WHATSAPP:");
    console.log("   1. Abra o WhatsApp no celular");
    console.log("   2. Toque em Aparelhos Conectados > Conectar um aparelho");
    console.log("   3. Aponte a câmera para o QR Code");
    console.log("=======================================================\n");
    qrcode.generate(qr, { small: true });
  });

  // Evento: Autenticado
  client.on("authenticated", () => {
    console.log("🔐 [WHATSAPP] Sessão autenticada com sucesso (LocalAuth).");
  });

  // Evento: Falha de autenticação
  client.on("auth_failure", (msg) => {
    console.error("❌ [WHATSAPP] Falha de autenticação:", msg);
  });

  // Evento: Conexão pronta para operar
  client.on("ready", () => {
    console.log("=======================================================");
    console.log("✅ REBUSS OPS — ROBÔ DE ATENDIMENTO OPERACIONAL ONLINE");
    console.log("   Status: Conectado e pronto para receber mensagens");
    console.log("   Fuso Horário Oficial: " + config.timezone);
    console.log("=======================================================\n");
  });

  // Evento: Desconexão com tentativa de reconexão controlada
  client.on("disconnected", (reason) => {
    console.warn(`⚠️ [WHATSAPP] Desconectado: ${reason}`);
    console.log("🔄 Tentando reconectar em 10 segundos...");
    setTimeout(() => {
      try {
        console.log("🔄 Reinicializando cliente WhatsApp...");
        client.initialize();
      } catch (err) {
        console.error("❌ Erro ao tentar reconectar:", err);
      }
    }, 10000);
  });

  // Evento: Recebimento de mensagens
  client.on("message", async (msg) => {
    await messageHandler.handleMessage(msg);
  });

  return {
    client,
    attendanceService,
    reportService,
    messageHandler,
    start: () => {
      console.log("🚀 [REBUSS OPS] Inicializando cliente WhatsApp...");
      return client.initialize();
    },
  };
}

module.exports = {
  createWhatsAppClient,
};

