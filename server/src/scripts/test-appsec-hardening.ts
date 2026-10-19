import "dotenv/config";
import http from "http";
import app from "../server.js";
import prisma from "../lib/prisma.js";
import { JWT_SECRET } from "../config/security.env.js";
import jwt from "jsonwebtoken";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function runSecurityTests() {
  console.log("==========================================================");
  console.log("  REBUSS OPS — SUÍTE DE TESTES DE SEGURANÇA E HARDENING");
  console.log("==========================================================\n");

  let server: http.Server | null = null;
  let apiBase = "http://127.0.0.1:3001/api";

  try {
    const probe = await fetch("http://127.0.0.1:3001/api/health", {
      signal: AbortSignal.timeout(1000),
    });
    if (!probe.ok) throw new Error("Server not running");
  } catch {
    await new Promise<void>((resolve) => {
      server = (app as any).listen(0, "127.0.0.1", () => {
        const addr = server!.address();
        const port = typeof addr === "object" && addr ? addr.port : 3001;
        apiBase = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  }

  try {
    // -------------------------------------------------------------------------
    // 1. CABEÇALHOS DE SEGURANÇA (HELMET) & FINGERPRINTING
    // -------------------------------------------------------------------------
    console.log("-> [1] Verificação de Cabeçalhos HTTP de Segurança e Fingerprinting:");
    const healthRes = await fetch(`${apiBase}/health`);
    assert(healthRes.status === 200, "Endpoint /health responde 200");

    const poweredBy = healthRes.headers.get("x-powered-by");
    assert(!poweredBy, "Cabeçalho X-Powered-By deve estar removido (anti-fingerprinting)");
    console.log("   [OK] X-Powered-By ocultado com sucesso (Express não exposto).");

    const nosniff = healthRes.headers.get("x-content-type-options");
    assert(nosniff === "nosniff", "Cabeçalho X-Content-Type-Options deve ser nosniff");
    console.log("   [OK] X-Content-Type-Options: nosniff verificado.");

    const frameOptions = healthRes.headers.get("x-frame-options");
    assert(frameOptions === "DENY", "Cabeçalho X-Frame-Options deve ser DENY (anti-clickjacking)");
    console.log("   [OK] X-Frame-Options: DENY verificado.");

    const csp = healthRes.headers.get("content-security-policy");
    assert(!!csp && csp.includes("default-src 'self'"), "Content-Security-Policy configurado");
    console.log("   [OK] Content-Security-Policy verificado.");

    // -------------------------------------------------------------------------
    // 2. PROTEÇÃO DO ADMINISTRADOR PRINCIPAL CONTRA REBAIXAMENTO E DESATIVAÇÃO
    // -------------------------------------------------------------------------
    console.log("\n-> [2] Proteção Inviolável do Administrador Principal (kelvimatosalves@gmail.com):");
    const adminUser = await prisma.usuario.findUnique({
      where: { email: "kelvimatosalves@gmail.com" },
    });
    assert(!!adminUser, "Administrador kelvimatosalves@gmail.com deve existir no banco");

    const adminToken = jwt.sign(
      { id: adminUser!.id, email: adminUser!.email, perfil: "ADMIN" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Tentativa 1: Rebaixar para OPERADOR via PATCH /api/users/:id
    const demoteRes = await fetch(`${apiBase}/users/${adminUser!.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ perfil: "OPERADOR" }),
    });
    assert(
      demoteRes.status === 403,
      `Tentativa de rebaixar administrador principal deve retornar 403, retornou ${demoteRes.status}`
    );
    console.log("   [OK] Tentativa de rebaixar perfil do admin bloqueada com HTTP 403 Forbidden.");

    // Tentativa 2: Desativar conta do administrador principal via PATCH /api/users/:id/status
    const deactivateRes = await fetch(`${apiBase}/users/${adminUser!.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ ativo: false }),
    });
    assert(
      deactivateRes.status === 400,
      `Tentativa de desativar admin principal deve retornar 400, retornou ${deactivateRes.status}`
    );
    console.log("   [OK] Tentativa de desativar conta do admin bloqueada com HTTP 400 Bad Request.");

    // -------------------------------------------------------------------------
    // 3. PROTEÇÃO CONTRA VAZAMENTO DE RESET TOKEN EM PRODUÇÃO
    // -------------------------------------------------------------------------
    console.log("\n-> [3] Proteção de Redefinição de Senha e Sigilo de Tokens:");
    // Simular requisição de reset para o admin
    const resetRes = await fetch(`${apiBase}/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "kelvimatosalves@gmail.com" }),
    });
    const resetData = (await resetRes.json()) as any;
    assert(resetRes.status === 200, "Solicitação de redefinição deve responder HTTP 200");
    assert(
      resetData.resetToken === undefined,
      "resetToken público NÃO pode ser retornado na resposta JSON"
    );
    console.log("   [OK] Sigilo de resetToken garantido: nenhum token público exposto no JSON.");

    // -------------------------------------------------------------------------
    // 4. PROTEÇÃO SSRF CONTRA URLS MALICIOSAS OU HOSTS FRAUDULENTOS
    // -------------------------------------------------------------------------
    console.log("\n-> [4] Proteção contra SSRF no Gerador de Escalas:");
    const ssrfRes = await fetch(`${apiBase}/scale-generator/locate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        input: "https://evil-attacker-google.com/maps/place/123",
      }),
    });
    assert(
      ssrfRes.status === 400,
      `Host externo malicioso deve ser rejeitado com 400, retornou ${ssrfRes.status}`
    );
    console.log("   [OK] URL externa maliciosa bloqueada com HTTP 400 (SSRF prevenido).");

    // -------------------------------------------------------------------------
    // 5. VALIDAÇÃO DE CRIPTOGRAFIA DO JWT_SECRET
    // -------------------------------------------------------------------------
    console.log("\n-> [5] Integridade Criptográfica de Assinatura JWT:");
    assert(
      JWT_SECRET.length >= 32,
      `JWT_SECRET deve possuir no mínimo 32 caracteres (atual: ${JWT_SECRET.length})`
    );
    console.log(`   [OK] JWT_SECRET validado com ${JWT_SECRET.length} caracteres criptograficamente seguros.`);

    console.log("\n==========================================================");
    console.log("  TODAS AS VERIFICAÇÕES DE APPSEC FORAM APROVADAS COM SUCESSO!");
    console.log("==========================================================");
  } finally {
    if (server) {
      (server as any)?.close();
    }
    await prisma.$disconnect();
  }
}

runSecurityTests().catch(async (err) => {
  console.error("\n❌ FALHA NOS TESTES DE SEGURANÇA:", err);
  await prisma.$disconnect();
  process.exit(1);
});

