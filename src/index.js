/**
 * REBUSS OPS — Ponto de Entrada do Robô Oficial de Atendimento Operacional
 * 
 * Inicia o robô com whatsapp-web.js, LocalAuth e integração de escalas.
 */

const { createWhatsAppClient } = require("./whatsapp/client");
const config = require("./config");

console.log("=======================================================");
console.log("🤖 REBUSS OPS — ROBÔ OFICIAL DE ATENDIMENTO OPERACIONAL");
console.log("   Operações • Controle de Escalas • Confirmação de Postos");
console.log(`   Horário Local: ${config.timezone}`);
console.log("=======================================================\n");

// Proteção contra encerramento inesperado por exceções não tratadas
process.on("uncaughtException", (error) => {
  console.error("❌ [PROCESS] Exceção não capturada:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [PROCESS] Rejeição de Promise não tratada:", reason);
});

const bot = createWhatsAppClient();

// Encerramento gracioso
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Recebido sinal ${signal}. Encerrando robô Rebuss Ops com segurança...`);
  try {
    await bot.client.destroy();
    console.log("👋 Sessão encerrada com sucesso.");
  } catch (err) {
    console.error("Erro ao destruir cliente:", err);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

bot.start().catch((err) => {
  console.error("❌ Falha fatal ao inicializar robô:", err);
});

