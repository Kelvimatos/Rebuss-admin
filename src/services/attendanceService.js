/**
 * REBUSS OPS — Serviço de Gestão e Persistência de Escalas e Presenças
 * 
 * Camada de persistência organizada para escalas, postos e confirmações,
 * com suporte a persistência em arquivo JSON local e integração preparada
 * para a API / banco de dados PostgreSQL do Rebuss Ops.
 */

const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const config = require("../config");

// Formato padrão de status do posto
const AttendanceStatus = {
  PENDENTE: "PENDENTE",
  CONFIRMADO: "CONFIRMADO",
  RECUSADO: "RECUSADO",
};

/**
 * Normaliza número de telefone para formato padronizado (apenas dígitos)
 * Trata:
 * - 5511999998888@c.us -> 5511999998888
 * - (11) 99999-8888 -> 5511999998888
 * - 11999998888 -> 5511999998888
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(/[^\d]/g, "");

  // Se tiver 10 ou 11 dígitos (DDD + número), adiciona código do Brasil 55
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
  }

  return digits;
}

/**
 * Compara dois números de telefone considerando variações de 9º dígito ou código de país
 */
function phonesMatch(phoneA, phoneB) {
  const normA = normalizePhoneNumber(phoneA);
  const normB = normalizePhoneNumber(phoneB);

  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Compara os últimos 8 dígitos (número base sem 9º dígito / ddd)
  if (normA.length >= 8 && normB.length >= 8) {
    const endA = normA.slice(-8);
    const endB = normB.slice(-8);
    if (endA === endB) {
      // Se tiverem DDD, confere se o DDD coincide
      const dddA = normA.length >= 10 ? normA.slice(-10, -8) : "";
      const dddB = normB.length >= 10 ? normB.slice(-10, -8) : "";
      if (dddA && dddB && dddA === dddB) return true;
    }
  }

  return false;
}

class AttendanceService {
  constructor(storagePath = config.storagePath) {
    this.storagePath = storagePath;
    this.data = {
      escalas: [],
      sessoesAtivas: {}, // phone -> { step: 'DISAMBIGUATION', escalas: [], pendingIntention: 'CONFIRMAR' }
      ultimaAtualizacao: new Date().toISOString(),
    };

    this._initStorage();
  }

  /**
   * Inicializa o arquivo de armazenamento com dados padrão caso não exista
   */
  _initStorage() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.storagePath)) {
        const fileContent = fs.readFileSync(this.storagePath, "utf-8");
        this.data = JSON.parse(fileContent);
      } else {
        // Gera seed inicial com operações reais de exemplo
        this.data.escalas = this._getSeedData();
        this._save();
      }
    } catch (error) {
      console.error("❌ [AttendanceService] Erro ao carregar armazenamento:", error);
      this.data.escalas = this._getSeedData();
    }
  }

  /**
   * Salva o estado atual no disco de forma síncrona/atômica
   */
  _save() {
    try {
      this.data.ultimaAtualizacao = new Date().toISOString();
      const tempPath = `${this.storagePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), "utf-8");
      fs.renameSync(tempPath, this.storagePath);
      return true;
    } catch (error) {
      console.error("❌ [AttendanceService] Falha ao persistir dados no disco:", error);
      return false;
    }
  }

  /**
   * Dados semente com operações e lojas do Rebuss Ops
   */
  _getSeedData() {
    const today = moment().tz(config.timezone).format("YYYY-MM-DD");

    return [
      {
        id: "esc-sp-001",
        loja: "GPA Águas Claras",
        operacao: "Inventário Noturno",
        data: today,
        horario: "18h30",
        postosNecessarios: 10,
        postos: [
          {
            id: "post-101",
            cargo: "Líder de Equipe",
            colaboradorNome: "Carlos Eduardo Silva",
            telefone: "5511999991111",
            status: AttendanceStatus.CONFIRMADO,
            confirmadoEm: new Date().toISOString(),
            historico: [],
          },
          {
            id: "post-102",
            cargo: "Contador de Estoque",
            colaboradorNome: "Mariana Souza",
            telefone: "5511999992222",
            status: AttendanceStatus.PENDENTE,
            confirmadoEm: null,
            historico: [],
          },
          {
            id: "post-103",
            cargo: "Contador de Estoque",
            colaboradorNome: "Lucas Almeida",
            telefone: "5511999993333",
            status: AttendanceStatus.RECUSADO,
            confirmadoEm: null,
            historico: [],
          },
          {
            id: "post-104",
            cargo: "Apoio Operacional",
            colaboradorNome: "Juliana Santos",
            telefone: "5511999994444",
            status: AttendanceStatus.PENDENTE,
            confirmadoEm: null,
            historico: [],
          },
        ],
      },
      {
        id: "esc-sp-002",
        loja: "Carrefour Morumbi",
        operacao: "Inventário Geral",
        data: today,
        horario: "21h00",
        postosNecessarios: 8,
        postos: [
          {
            id: "post-201",
            cargo: "Supervisor",
            colaboradorNome: "Rodrigo Ferreira",
            telefone: "5511999995555",
            status: AttendanceStatus.PENDENTE,
            confirmadoEm: null,
            historico: [],
          },
          {
            id: "post-202",
            cargo: "Auditor de Estoque",
            colaboradorNome: "Juliana Santos", // Exemplo de colaborador em mais de uma loja
            telefone: "5511999994444",
            status: AttendanceStatus.PENDENTE,
            confirmadoEm: null,
            historico: [],
          },
        ],
      },
      {
        id: "esc-sp-003",
        loja: "Assaí Santo Amaro",
        operacao: "Auditoria Cíclica",
        data: today,
        horario: "22h00",
        postosNecessarios: 5,
        postos: [
          {
            id: "post-301",
            cargo: "Contador",
            colaboradorNome: "Amanda Lima",
            telefone: "5511999996666",
            status: AttendanceStatus.CONFIRMADO,
            confirmadoEm: new Date().toISOString(),
            historico: [],
          },
        ],
      },
    ];
  }

  /**
   * Busca todas as escalas cadastradas
   */
  getAllScales() {
    return this.data.escalas || [];
  }

  /**
   * Adiciona ou substitui uma escala no sistema
   */
  saveScale(scale) {
    if (!scale.id) {
      scale.id = `esc-${Date.now()}`;
    }
    const idx = this.data.escalas.findIndex((e) => e.id === scale.id);
    if (idx >= 0) {
      this.data.escalas[idx] = scale;
    } else {
      this.data.escalas.push(scale);
    }
    this._save();
    return scale;
  }

  /**
   * Localiza todas as escalas e postos associados ao telefone do colaborador
   * 
   * @param {string} phone - Telefone do colaborador
   * @param {string} [dateFilter] - Opcional, filtrar por data YYYY-MM-DD
   * @returns {Array<{ escalaId, loja, operacao, data, horario, posto }>}
   */
  findScalesByPhone(phone, dateFilter = null) {
    const results = [];
    if (!phone) return results;

    const normPhone = normalizePhoneNumber(phone);

    for (const escala of this.data.escalas) {
      if (dateFilter && escala.data !== dateFilter) {
        continue;
      }

      for (const posto of escala.postos || []) {
        if (posto.telefone && phonesMatch(posto.telefone, normPhone)) {
          results.push({
            escalaId: escala.id,
            loja: escala.loja,
            operacao: escala.operacao,
            data: escala.data,
            horario: escala.horario,
            posto: { ...posto },
          });
        }
      }
    }

    return results;
  }

  /**
   * Localiza postos pendentes de confirmação para o telefone
   */
  findPendingScalesByPhone(phone, dateFilter = null) {
    return this.findScalesByPhone(phone, dateFilter).filter(
      (item) => item.posto.status === AttendanceStatus.PENDENTE
    );
  }

  /**
   * Atualiza o status de presença de um posto específico com histórico e idempotência
   * 
   * @param {string} escalaId
   * @param {string} postoId
   * @param {"CONFIRMADO" | "RECUSADO" | "PENDENTE"} newStatus
   * @param {Object} details - Detalhes da mensagem (texto, id, canal)
   * @returns {{ success: boolean, updated: boolean, previousStatus: string, scale: Object, post: Object }}
   */
  updateAttendanceStatus(escalaId, postoId, newStatus, details = {}) {
    const escala = this.data.escalas.find((e) => e.id === escalaId);
    if (!escala) {
      return { success: false, error: "Escala não encontrada" };
    }

    const posto = escala.postos.find((p) => p.id === postoId);
    if (!posto) {
      return { success: false, error: "Posto não encontrado na escala" };
    }

    const previousStatus = posto.status;
    const isSameStatus = previousStatus === newStatus;

    const agora = new Date().toISOString();

    // Se já estava com o mesmo status, apenas registra novo evento no histórico sem duplicar contagens
    if (isSameStatus) {
      if (!posto.historico) posto.historico = [];
      posto.historico.push({
        dataHora: agora,
        evento: "REPETICAO_RESPOSTA",
        status: newStatus,
        mensagem: details.rawText || "",
        messageId: details.messageId || null,
      });
      this._save();
      return {
        success: true,
        updated: false,
        previousStatus,
        newStatus,
        scale: escala,
        post: posto,
      };
    }

    // Atualiza status e registra transição
    posto.status = newStatus;
    if (newStatus === AttendanceStatus.CONFIRMADO) {
      posto.confirmadoEm = agora;
    }

    if (!posto.historico) posto.historico = [];
    posto.historico.push({
      dataHora: agora,
      evento: "TRANSICAO_STATUS",
      statusAnterior: previousStatus,
      novoStatus: newStatus,
      mensagem: details.rawText || "",
      messageId: details.messageId || null,
    });

    const saved = this._save();
    return {
      success: saved,
      updated: true,
      previousStatus,
      newStatus,
      scale: escala,
      post: posto,
    };
  }

  /**
   * Gerenciamento de sessão de desambiguação (quando o colaborador tem 2+ escalas)
   */
  setDisambiguationSession(phone, pendingScales, pendingIntention) {
    const normPhone = normalizePhoneNumber(phone);
    this.data.sessoesAtivas[normPhone] = {
      step: "DISAMBIGUATION",
      escalas: pendingScales,
      pendingIntention, // 'CONFIRMADO' ou 'RECUSADO' ou 'INDEFINIDO'
      timestamp: Date.now(),
    };
  }

  getDisambiguationSession(phone) {
    const normPhone = normalizePhoneNumber(phone);
    const session = this.data.sessoesAtivas[normPhone];
    if (!session) return null;

    // Expira sessão após 30 minutos
    if (Date.now() - session.timestamp > 30 * 60 * 1000) {
      delete this.data.sessoesAtivas[normPhone];
      return null;
    }

    return session;
  }

  clearSession(phone) {
    const normPhone = normalizePhoneNumber(phone);
    delete this.data.sessoesAtivas[normPhone];
  }
}

module.exports = {
  AttendanceStatus,
  normalizePhoneNumber,
  phonesMatch,
  AttendanceService,
};

