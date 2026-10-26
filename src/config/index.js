/**
 * REBUSS OPS — Configurações do Robô de Atendimento Operacional
 */
const path = require("path");
const moment = require("moment-timezone");

const TIMEZONE = "America/Sao_Paulo";

module.exports = {
  timezone: TIMEZONE,

  // Intervalo mínimo entre saudações automáticas para o mesmo contato (evita spam)
  // Padrão: 15 minutos (900.000 ms)
  greetingCooldownMs: parseInt(process.env.GREETING_COOLDOWN_MS, 10) || 15 * 60 * 1000,

  // Tempo de retenção para deduplicação de mensagens (5 minutos)
  deduplicationTtlMs: 5 * 60 * 1000,

  // Mensagens oficiais da operação
  messages: {
    standardGreeting: "Olá! Tudo bem? Recebi sua mensagem. Já já vou entrar em contato com você.",
    morningGreeting: "Bom dia! Tudo bem? Recebi sua mensagem. Já já vou entrar em contato com você.",
    afternoonGreeting: "Boa tarde! Tudo bem? Recebi sua mensagem. Já já vou entrar em contato com você.",
    nightGreeting: "Boa noite! Tudo bem? Recebi sua mensagem. Já já vou entrar em contato com você.",
    
    // Pergunta de esclarecimento quando a resposta é indefinida
    clarificationPrompt: "Você consegue confirmar sua presença? Responda SIM para confirmar ou NÃO para recusar.",
    
    // Confirmação registrada com sucesso
    confirmationSuccess: (loja, data, horario) =>
      `✅ Presença confirmada com sucesso!\n\n🏪 Loja: ${loja}\n📅 Data: ${data}\n⏰ Horário: ${horario}\n\nObrigado pela confirmação. Bom trabalho!`,

    // Recusa registrada com sucesso
    refusalSuccess: (loja, data) =>
      `⚠️ Registramos que você NÃO poderá comparecer à escala.\n\n🏪 Loja: ${loja}\n📅 Data: ${data}\n\nA coordenação operacional já foi notificada para substituição.`,

    // Alerta de alteração de estado (mudança de ideia)
    statusUpdated: (novoStatus, loja) =>
      `ℹ️ O status da sua escala na loja ${loja} foi atualizado para: *${novoStatus}*.`,

    // Múltiplas escalas pendentes
    multipleScalesPrompt: (escalas) => {
      let msg = "Identifiquei mais de uma escala pendente para você:\n\n";
      escalas.forEach((esc, idx) => {
        msg += `*${idx + 1}* - ${esc.loja} | ${esc.data} às ${esc.horario || "A definir"}\n`;
      });
      msg += "\nPor favor, responda com o *número* da escala que deseja responder (ex: 1).";
      return msg;
    },
  },

  // Retorna a saudação de acordo com o horário oficial de São Paulo
  getTimeBasedGreeting(date = new Date()) {
    const spHour = parseInt(moment(date).tz(TIMEZONE).format("H"), 10);
    if (spHour >= 5 && spHour < 12) {
      return this.messages.morningGreeting;
    } else if (spHour >= 12 && spHour < 18) {
      return this.messages.afternoonGreeting;
    } else {
      return this.messages.nightGreeting;
    }
  },

  // Configurações do Puppeteer / WhatsApp Client
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      "--disable-default-apps",
      "--no-default-browser-check",
    ],
  },

  // Caminho da persistência de dados das escalas
  storagePath: path.resolve(__dirname, "../../data/scales-store.json"),
  sessionPath: path.resolve(__dirname, "../../.wwebjs_auth"),
};

