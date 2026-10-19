import "dotenv/config";

const DEV_DEFAULT_SECRET = "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

const isProduction = process.env.NODE_ENV === "production";
const rawSecret = process.env.JWT_SECRET?.trim();

if (isProduction) {
  if (!rawSecret) {
    throw new Error(
      "[FATAL SECURITY ERROR] Em produção, a variável de ambiente JWT_SECRET é estritamente obrigatória."
    );
  }
  if (rawSecret.length < 32) {
    throw new Error(
      "[FATAL SECURITY ERROR] JWT_SECRET deve ter no mínimo 32 caracteres criptograficamente seguros em produção."
    );
  }
  if (rawSecret === DEV_DEFAULT_SECRET) {
    throw new Error(
      "[FATAL SECURITY ERROR] JWT_SECRET não pode utilizar o segredo padrão de desenvolvimento em produção. Gere uma chave forte."
    );
  }
}

export const JWT_SECRET: string = rawSecret || DEV_DEFAULT_SECRET;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
};

export function getAllowedOrigins(): string[] {
  const allowed: string[] = [];
  if (process.env.FRONTEND_URL) {
    allowed.push(process.env.FRONTEND_URL.trim().replace(/\/$/, ""));
  }
  if (process.env.ALLOWED_ORIGINS) {
    const list = process.env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim().replace(/\/$/, ""))
      .filter(Boolean);
    allowed.push(...list);
  }

  // Em desenvolvimento, permite origens locais padrão
  if (!isProduction) {
    allowed.push(
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://localhost:3001"
    );
  }

  return [...new Set(allowed)];
}

