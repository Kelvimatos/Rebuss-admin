/**
 * REBUSS OPS — Handler Central de Mensagens do WhatsApp
 * 
 * Processa mensagens recebidas aplicando as regras:
 * 1. Blindagem: ignora grupos, mensagens do próprio bot e mensagens duplicadas.
 * 2. Gestão de saudações com adaptação ao fuso de SP e controle de cooldown anti-spam.
 * 3. Classificação com prioridade de negação (CONFIRMADO, RECUSADO, INDEFINIDO).
 * 4. Desambiguação de múltiplas escalas para o mesmo colaborador.
 * 5. Registro idempotente e rastreável na camada de persistência.
 * 6. Comando de relatório operacional para supervisores (!relatorio).
 */

const moment = require("moment-timezone");
const config = require("../config");
const {
  ClassificationTypes,
  classifyResponse,
  isGreeting,
} = require("../services/responseClassifier");
const {
  AttendanceStatus,
  normalizePhoneNumber,
} = require("../services/attendanceService");

// Mapa de controle de cooldown para saudações: phone -> timestamp
const greetingCooldownMap = new Map();

// Conjunto para deduplicação de mensagens: messageId -> timestamp
const processedMessageIds = new Map();

// Limpeza periódica do cache de deduplicação a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, time] of processedMessageIds.entries()) {
    if (now - time > config.deduplicationTtlMs) {
      processedMessageIds.delete(id);
    }
  }
  for (const [phone, time] of greetingCooldownMap.entries()) {
    if (now - time > config.greetingCooldownMs * 2) {
      greetingCooldownMap.delete(phone);
    }
  }
}, 10 * 60 * 1000).unref();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class MessageHandler {
  /**
   * @param {Object} options
   * @param {Object} options.client - Instância do whatsapp-web.js Client
   * @param {import('../services/attendanceService').AttendanceService} options.attendanceService
   * @param {import('../services/reportService').ReportService} options.reportService
   */
  constructor({ client, attendanceService, reportService }) {
    this.client = client;
    this.attendanceService = attendanceService;
    this.reportService = reportService;
  }

  /**
   * Ponto de entrada para processamento de mensagem
   */
  async handleMessage(msg) {
    try {
      // 1. BLINDAGEM: Ignora mensagens enviadas pelo próprio robô
      if (msg.fromMe) {
        return;
      }

      // 2. BLINDAGEM: Ignora grupos (apenas conversas privadas)
      if (!msg.from || msg.from.endsWith("@g.us") || msg.broadcast) {
        return;
      }

      // 3. BLINDAGEM: Blindagem extra checando o objeto Chat
      const chat = await msg.getChat();
      if (chat.isGroup) {
        return;
      }

      // 4. BLINDAGEM: Deduplicação de mensagens
      const messageId = msg.id && msg.id._serialized ? msg.id._serialized : msg.id?.id;
      if (messageId) {
        if (processedMessageIds.has(messageId)) {
          console.log(`[BOT] 🔁 Mensagem duplicada ignorada: ${messageId}`);
          return;
        }
        processedMessageIds.set(messageId, Date.now());
      }

      const rawText = msg.body ? msg.body.trim() : "";
      if (!rawText) return;

      const senderPhone = normalizePhoneNumber(msg.from);
      const contact = await msg.getContact().catch(() => ({ pushname: "Colaborador" }));
      const senderName = contact?.pushname || "Colaborador";

      console.log(`[BOT] 📩 Mensagem de ${senderName} (${senderPhone}): "${rawText}"`);

      // 5. COMANDO OPERACIONAL DE RELATÓRIO (!relatorio ou #relatorio)
      if (/^[!#]relat[oó]rio/i.test(rawText)) {
        await this._sendTyping(chat);
        const report = this.reportService.generateReport();
        const formatted = this.reportService.formatTextReport(report);
        await msg.reply(formatted);
        console.log(`[BOT] 📊 Relatório enviado para ${senderPhone}`);
        return;
      }

      // 6. VERIFICAÇÃO DE SESSÃO ATIVA (ex: Desambiguação de escalas)
      const activeSession = this.attendanceService.getDisambiguationSession(senderPhone);
      if (activeSession && activeSession.step === "DISAMBIGUATION") {
        await this._handleDisambiguationResponse(msg, chat, senderPhone, senderName, rawText, activeSession);
        return;
      }

      // 7. BUSCA DE ESCALAS ASSOCIADAS AO NÚMERO DO COLABORADOR
      const pendingScales = this.attendanceService.findPendingScalesByPhone(senderPhone);
      const allScales = this.attendanceService.findScalesByPhone(senderPhone);

      // 8. CLASSIFICAÇÃO DA MENSAGEM
      const isWaitingAttendance = pendingScales.length > 0;
      const classification = classifyResponse(rawText, { isWaitingForAttendance: isWaitingAttendance });

      console.log(`[BOT] 🏷️ Classificação: ${classification.type} (confiança: ${classification.confidence})`);

      // 9. TRATAMENTO POR TIPO DE CLASSIFICAÇÃO

      // Caso A: Se for estritamente uma SAUDAÇÃO (e nenhuma confirmação de escala foi afirmada)
      if (classification.type === ClassificationTypes.SAUDACAO) {
        await this._handleGreeting(msg, chat, senderPhone, pendingScales);
        return;
      }

      // Caso B: Se houver escala pendente e o colaborador responder CONFIRMAÇÃO ou RECUSA
      if (pendingScales.length === 1) {
        const item = pendingScales[0];

        if (classification.type === ClassificationTypes.CONFIRMADO) {
          await this._sendTyping(chat);
          const result = this.attendanceService.updateAttendanceStatus(
            item.escalaId,
            item.posto.id,
            AttendanceStatus.CONFIRMADO,
            { rawText, messageId }
          );

          if (result.success) {
            console.log(`[BOT] ✅ Presença CONFIRMADA: ${senderName} na loja ${item.loja}`);
            await msg.reply(
              config.messages.confirmationSuccess(item.loja, item.data, item.horario || "18h30")
            );
          }
          return;
        }

        if (classification.type === ClassificationTypes.RECUSADO) {
          await this._sendTyping(chat);
          const result = this.attendanceService.updateAttendanceStatus(
            item.escalaId,
            item.posto.id,
            AttendanceStatus.RECUSADO,
            { rawText, messageId }
          );

          if (result.success) {
            console.log(`[BOT] ❌ Presença RECUSADA: ${senderName} na loja ${item.loja}`);
            await msg.reply(config.messages.refusalSuccess(item.loja, item.data));
          }
          return;
        }

        if (classification.type === ClassificationTypes.INDEFINIDO) {
          await this._sendTyping(chat);
          console.log(`[BOT] ❓ Resposta indefinida de ${senderName}. Solicitando esclarecimento.`);
          await msg.reply(config.messages.clarificationPrompt);
          return;
        }
      }

      // Caso C: Se o colaborador estiver em MÚLTIPLAS escalas pendentes (> 1)
      if (pendingScales.length > 1) {
        if (
          classification.type === ClassificationTypes.CONFIRMADO ||
          classification.type === ClassificationTypes.RECUSADO
        ) {
          // Não escolhe arbitrariamente! Abre sessão para o colaborador escolher
          this.attendanceService.setDisambiguationSession(
            senderPhone,
            pendingScales,
            classification.type
          );
          await this._sendTyping(chat);
          console.log(`[BOT] 🔀 ${senderName} possui ${pendingScales.length} escalas. Solicitando seleção.`);
          await msg.reply(config.messages.multipleScalesPrompt(pendingScales));
          return;
        }

        if (classification.type === ClassificationTypes.INDEFINIDO) {
          await this._sendTyping(chat);
          await msg.reply(config.messages.clarificationPrompt);
          return;
        }
      }

      // Caso D: O colaborador já havia respondido, mas enviou uma nova resposta
      // (ex: tinha confirmado, mas agora mandou "Não vou poder ir" ou vice-versa)
      if (allScales.length > 0 && pendingScales.length === 0) {
        const latestItem = allScales[allScales.length - 1];

        if (
          classification.type === ClassificationTypes.CONFIRMADO &&
          latestItem.posto.status !== AttendanceStatus.CONFIRMADO
        ) {
          await this._sendTyping(chat);
          this.attendanceService.updateAttendanceStatus(
            latestItem.escalaId,
            latestItem.posto.id,
            AttendanceStatus.CONFIRMADO,
            { rawText, messageId }
          );
          await msg.reply(config.messages.statusUpdated("CONFIRMADO", latestItem.loja));
          return;
        }

        if (
          classification.type === ClassificationTypes.RECUSADO &&
          latestItem.posto.status !== AttendanceStatus.RECUSADO
        ) {
          await this._sendTyping(chat);
          this.attendanceService.updateAttendanceStatus(
            latestItem.escalaId,
            latestItem.posto.id,
            AttendanceStatus.RECUSADO,
            { rawText, messageId }
          );
          await msg.reply(config.messages.statusUpdated("RECUSADO", latestItem.loja));
          return;
        }

        if (
          classification.type === ClassificationTypes.CONFIRMADO ||
          classification.type === ClassificationTypes.RECUSADO
        ) {
          // Repetição da mesma confirmação já registrada
          this.attendanceService.updateAttendanceStatus(
            latestItem.escalaId,
            latestItem.posto.id,
            latestItem.posto.status,
            { rawText, messageId }
          );
          return;
        }
      }

      // Caso E: Conversa geral ou dúvida comum (sem pendências de escala)
      // Aplica regra de cooldown anti-spam
      await this._handleGeneralInquiry(msg, chat, senderPhone);
    } catch (error) {
      console.error("[BOT] ❌ Erro ao processar mensagem:", error);
    }
  }

  /**
   * Resposta de saudação com controle de cooldown anti-spam
   */
  async _handleGreeting(msg, chat, senderPhone, pendingScales) {
    const lastGreeting = greetingCooldownMap.get(senderPhone) || 0;
    const now = Date.now();

    // Se já respondeu recentemente, não envia para não gerar spam
    if (now - lastGreeting < config.greetingCooldownMs) {
      console.log(`[BOT] ⏳ Cooldown ativo para ${senderPhone}. Saudação repetida ignorada.`);
      return;
    }

    greetingCooldownMap.set(senderPhone, now);
    await this._sendTyping(chat);

    let greetingText = config.getTimeBasedGreeting();

    // Se houver escala pendente, adiciona lembrete gentil
    if (pendingScales && pendingScales.length === 1) {
      const esc = pendingScales[0];
      greetingText += `\n\n📌 Consta em nosso sistema uma escala para você na loja *${esc.loja}* hoje (${esc.data} às ${esc.horario || "18h30"}).\n\nVocê confirma sua presença? (Responda *SIM* para confirmar ou *NÃO* para recusar)`;
    }

    await msg.reply(greetingText);
    console.log(`[BOT] 🤝 Saudação adaptada enviada para ${senderPhone}`);
  }

  /**
   * Tratamento de perguntas gerais sem contexto de escala
   */
  async _handleGeneralInquiry(msg, chat, senderPhone) {
    const lastInteraction = greetingCooldownMap.get(senderPhone) || 0;
    const now = Date.now();

    // Se dentro do intervalo de cooldown, evita spam
    if (now - lastInteraction < config.greetingCooldownMs) {
      return;
    }

    greetingCooldownMap.set(senderPhone, now);
    await this._sendTyping(chat);
    await msg.reply(config.messages.standardGreeting);
  }

  /**
   * Trata a seleção numérica de desambiguação
   */
  async _handleDisambiguationResponse(msg, chat, senderPhone, senderName, rawText, session) {
    const optionNumber = parseInt(rawText.replace(/[^\d]/g, ""), 10);
    const escalas = session.escalas || [];

    if (!optionNumber || optionNumber < 1 || optionNumber > escalas.length) {
      await this._sendTyping(chat);
      await msg.reply(
        `Por favor, digite um número válido entre *1* e *${escalas.length}* para selecionar sua escala.`
      );
      return;
    }

    const selected = escalas[optionNumber - 1];
    const targetStatus = session.pendingIntention;

    this.attendanceService.clearSession(senderPhone);
    await this._sendTyping(chat);

    const result = this.attendanceService.updateAttendanceStatus(
      selected.escalaId,
      selected.posto.id,
      targetStatus,
      { rawText: `Seleção opção ${optionNumber}` }
    );

    if (result.success) {
      if (targetStatus === AttendanceStatus.CONFIRMADO) {
        console.log(`[BOT] ✅ Presença CONFIRMADA (via seleção): ${senderName} na loja ${selected.loja}`);
        await msg.reply(
          config.messages.confirmationSuccess(selected.loja, selected.data, selected.horario || "18h30")
        );
      } else {
        console.log(`[BOT] ❌ Presença RECUSADA (via seleção): ${senderName} na loja ${selected.loja}`);
        await msg.reply(config.messages.refusalSuccess(selected.loja, selected.data));
      }
    }
  }

  /**
   * Simulação de digitação no WhatsApp para experiência humanizada e fluida
   */
  async _sendTyping(chat, ms = 1200) {
    try {
      await chat.sendStateTyping();
      await delay(ms);
    } catch {
      // Ignora erro se cliente Web não suportar digitação naquele instante
    }
  }
}

module.exports = {
  MessageHandler,
  greetingCooldownMap,
  processedMessageIds,
};

