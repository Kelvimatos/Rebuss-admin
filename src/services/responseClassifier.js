/**
 * REBUSS OPS — Classificador de Respostas Operacionais
 * 
 * Classifica mensagens de WhatsApp em:
 * - CONFIRMADO: aceitou a presença na escala
 * - RECUSADO: recusou ou não poderá comparecer (TEM PRIORIDADE ABSOLUTA)
 * - INDEFINIDO: resposta ambígua ou incompleta (não altera estado)
 * - SAUDACAO: mensagens comuns de início de conversa (oi, bom dia, etc.)
 * - OUTRO: mensagens fora do contexto de confirmação
 */

const ClassificationTypes = {
  CONFIRMADO: "CONFIRMADO",
  RECUSADO: "RECUSADO",
  INDEFINIDO: "INDEFINIDO",
  SAUDACAO: "SAUDACAO",
  OUTRO: "OUTRO",
};

/**
 * Remove acentos de uma string
 */
function removeAccents(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza o texto removendo acentos, pontuações desnecessárias, emojis e espaços extras
 */
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";
  return removeAccents(text)
    .toLowerCase()
    .replace(/[^\w\s!?,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica se o texto é uma saudação operacional
 */
function isGreeting(rawText) {
  const norm = normalizeText(rawText);
  if (!norm) return false;

  // Regex para saudações comuns com limites de palavra
  const greetingPatterns = [
    /^(oi|ola|opa|e ai|eai|fala)(\s+(pessoal|equipe|amigo|galera|rebuss))?[!?.]*$/i,
    /^(bom dia|boa tarde|boa noite)[!?.]*$/i,
    /^(tudo bem|tudo bom|tudo certo|como vai)[!?.]*$/i,
    /^(tem alguem ai|alguem ai|tem alguem)[!?.]*$/i,
    /^(oi|ola)\s*,\s*(bom dia|boa tarde|boa noite|tudo bem)[!?.]*$/i,
    /^(bom dia|boa tarde|boa noite)\s*,\s*(tudo bem|tudo bom)[!?.]*$/i,
  ];

  return greetingPatterns.some((pattern) => pattern.test(norm));
}

/**
 * Expressões e padrões de RECUSA (prioridade máxima)
 */
const REFUSAL_PATTERNS = [
  // Começo explícito com negação
  /^nao[!.]*$/i,
  /^nao vou[!.]*$/i,
  /^nao confirmo[!.]*$/i,
  /^nao posso[!.]*$/i,
  /^nao vai dar[!.]*$/i,
  /^nao poderei ir[!.]*$/i,
  /^nao poderei[!.]*$/i,
  /^nao consigo[!.]*$/i,
  /^nao estarei la[!.]*$/i,
  /^nao estarei[!.]*$/i,
  /^nao vou poder ir[!.]*$/i,
  /^nao vou poder[!.]*$/i,
  /^nao vou conseguir[!.]*$/i,
  /^nao vou conseguir ir[!.]*$/i,
  /^nao tenho como[!.]*$/i,
  /^nao tenho como ir[!.]*$/i,
  /^nao vai rolar[!.]*$/i,

  // Frases que contêm negação de presença (independente de conter "confirmo" ou "vou")
  /\bnao\s+(vou|confirmo|posso|vai\s+dar|poderei|consigo|estarei|vou\s+poder|vou\s+conseguir|tenho\s+como)\b/i,
  /\b(infelizmente|desculpe|perdao)\s+(nao\s+vou|nao\s+posso|nao\s+vai\s+dar|nao\s+consigo)\b/i,
  /\bnao\s+posso\s+comparecer\b/i,
  /\bnao\s+dara\s+para\s+ir\b/i,
  /\bsem\s+chance\b/i,
  /\bnem\s+pensar\b/i,
  /\bimpossivel\s+ir\b/i,
  /\bimpossivel\s+comparecer\b/i,
  /\brecuso\b/i,
  /\brecusado\b/i,
  /\bdesisto\b/i,
];

/**
 * Expressões e padrões de CONFIRMAÇÃO (avaliados somente se NÃO houver recusa)
 */
const CONFIRMATION_PATTERNS = [
  // Palavras ou frases exatas isoladas (com pontuação aceita)
  /^sim[!.]*$/i,
  /^ok[!.]*$/i,
  /^oquei[!.]*$/i,
  /^confirmo[!.]*$/i,
  /^confirmado[!.]*$/i,
  /^confirmada[!.]*$/i,
  /^vou[!.]*$/i,
  /^vou sim[!.]*$/i,
  /^vou ir[!.]*$/i,
  /^vou estar la[!.]*$/i,
  /^estarei la[!.]*$/i,
  /^estarei presente[!.]*$/i,
  /^pode contar comigo[!.]*$/i,
  /^conte comigo[!.]*$/i,
  /^positivo[!.]*$/i,
  /^presenca confirmada[!.]*$/i,
  /^fechado[!.]*$/i,
  /^com certeza[!.]*$/i,
  /^com certeza vou[!.]*$/i,
  /^certo[!.]*$/i,
  /^perfeito[!.]*$/i,

  // Frases compostas afirmativas com limites de palavra
  /\b(sim|ok)\s*,\s*(confirmo|vou|confirmado|estarei\s+la)\b/i,
  /\b(confirmo|confirmada|confirmado)\s+(presenca|escala|minha\s+presenca)\b/i,
  /\bpode\s+contar\s+comigo\b/i,
  /\bconte\s+comigo\b/i,
  /\bestarei\s+la\b/i,
  /\bcom\s+certeza\b/i,
];

/**
 * Expressões de INDEFINIÇÃO / DÚVIDA
 */
const INDEFINITE_PATTERNS = [
  /\btalvez\b/i,
  /\bvou\s+ver\b/i,
  /\bvou\s+analisar\b/i,
  /\bvou\s+checar\b/i,
  /\bdepois\s+te\s+(falo|aviso|respondo)\b/i,
  /\bmais\s+tarde\s+te\s+(falo|aviso)\b/i,
  /\bacho\s+que\s+(sim|nao)\b/i,
  /\bnao\s+sei\s+ainda\b/i,
  /\bainda\s+nao\s+sei\b/i,
  /\ba\s+confirmar\b/i,
  /\bdepende\b/i,
  /\bvou\s+tentar\b/i,
  /\bnao\s+tenho\s+certeza\b/i,
  /\bpreciso\s+ver\b/i,
  /\bte\s+confirmo\s+depois\b/i,
  /\bdepois\s+confirmo\b/i,
];

/**
 * Classifica a resposta de presença enviada pelo colaborador
 *
 * @param {string} rawText - Texto original da mensagem
 * @param {Object} options - Opções adicionais (ex: isContextAttendance)
 * @returns {{ type: string, confidence: number, matchedPattern: string, normalized: string }}
 */
function classifyResponse(rawText, options = {}) {
  if (!rawText || typeof rawText !== "string") {
    return {
      type: ClassificationTypes.OUTRO,
      confidence: 0,
      matchedPattern: "empty_text",
      normalized: "",
    };
  }

  const normalized = normalizeText(rawText);

  // 1. REGRA CRÍTICA: RECUSA TEM PRIORIDADE ABSOLUTA.
  // "Não confirmo", "Não vou", "Não posso", "Não vai dar" nunca podem ser classificados
  // como confirmação mesmo que contenham "confirmo" ou "vou".
  for (const pattern of REFUSAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        type: ClassificationTypes.RECUSADO,
        confidence: 1.0,
        matchedPattern: pattern.toString(),
        normalized,
      };
    }
  }

  // 2. Se não houver recusa, verifica se é uma INDEFINIÇÃO conhecida
  // (ex: "acho que sim", "não sei ainda", "talvez", "depois te falo")
  for (const pattern of INDEFINITE_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        type: ClassificationTypes.INDEFINIDO,
        confidence: 0.9,
        matchedPattern: pattern.toString(),
        normalized,
      };
    }
  }

  // 3. CONFIRMAÇÃO VÁLIDA
  // Somente se passou pelo crivo das negativas e indefinições
  for (const pattern of CONFIRMATION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        type: ClassificationTypes.CONFIRMADO,
        confidence: 1.0,
        matchedPattern: pattern.toString(),
        normalized,
      };
    }
  }

  // 4. Se for uma saudação (oi, bom dia, etc.)
  if (isGreeting(rawText)) {
    return {
      type: ClassificationTypes.SAUDACAO,
      confidence: 0.95,
      matchedPattern: "greeting",
      normalized,
    };
  }

  // 5. Se estivermos num contexto explícito de espera de confirmação
  // e o texto não corresponder a nenhuma regra clara, é INDEFINIDO
  if (options.isWaitingForAttendance) {
    return {
      type: ClassificationTypes.INDEFINIDO,
      confidence: 0.5,
      matchedPattern: "unclear_attendance_context",
      normalized,
    };
  }

  // 6. Caso contrário, é classificado como OUTRO
  return {
    type: ClassificationTypes.OUTRO,
    confidence: 0.2,
    matchedPattern: "generic_other",
    normalized,
  };
}

module.exports = {
  ClassificationTypes,
  normalizeText,
  removeAccents,
  isGreeting,
  classifyResponse,
};

