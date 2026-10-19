import "dotenv/config";
import prisma from "../lib/prisma.js";
import app from "../server.js";
import http from "http";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runAuthTests() {
  console.log("==========================================================");
  console.log("  REBUSS OPS — TESTES DE AUTENTICAÇÃO E PERMISSÕES (PARTE 8)");
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
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server!.address();
        const port = typeof addr === "object" && addr ? addr.port : 3001;
        apiBase = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  }

  try {
    // -------------------------------------------------------------------------
    // 1. TESTE DE LOGIN DOS 4 NOVOS USUÁRIOS + ADMINISTRADOR
    // -------------------------------------------------------------------------
    console.log("-> [1] Teste de login individual com senha inicial:");

    const accountsToTest = [
      { nome: "Bruno", email: "bruno@rebuss.com", pass: "1234", expectedPerfil: "OPERADOR" },
      { nome: "Francisco", email: "francisco@rebuss.com", pass: "1234", expectedPerfil: "OPERADOR" },
      { nome: "Arthur", email: "arthur@rebuss.com", pass: "1234", expectedPerfil: "OPERADOR" },
      { nome: "Matheus", email: "matheus@rebuss.com", pass: "1234", expectedPerfil: "OPERADOR" },
    ];

    const operatorTokens: Record<string, string> = {};

    for (const acc of accountsToTest) {
      const loginRes = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: acc.email, password: acc.pass }),
      });

      assert(loginRes.status === 200, `Login de ${acc.nome} falhou com status ${loginRes.status}`);
      const loginJson = (await loginRes.json()) as any;
      assert(loginJson.success === true, `Login de ${acc.nome} deve retornar success=true`);
      assert(loginJson.token, `Login de ${acc.nome} deve retornar token JWT`);
      assert(loginJson.user.perfil === acc.expectedPerfil, `${acc.nome} deve ter perfil ${acc.expectedPerfil}`);
      assert(loginJson.user.ativo === true, `${acc.nome} deve estar ativo`);

      operatorTokens[acc.email] = loginJson.token;
      console.log(`   [OK] Login de ${acc.nome} (${acc.email}): HTTP 200, Token recebido, Perfil: ${loginJson.user.perfil}`);
    }

    // -------------------------------------------------------------------------
    // 2. PRESERVAÇÃO E LOGIN DA CONTA ADMINISTRADOR PRINCIPAL
    // -------------------------------------------------------------------------
    console.log("\n-> [2] Preservação e login da conta administrativa principal:");
    const adminAccount = await prisma.usuario.findUnique({
      where: { email: "kelvimatosalves@gmail.com" },
    });
    assert(adminAccount, "Conta admin kelvimatosalves@gmail.com deve existir no banco");
    assert(adminAccount!.perfil === "ADMIN", "Conta principal deve possuir perfil ADMIN");

    // Generate admin token
    const jwt = (await import("jsonwebtoken")).default;
    const jwtSecret = process.env.JWT_SECRET || "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";
    const adminToken = jwt.sign(
      { id: adminAccount!.id, email: adminAccount!.email, perfil: adminAccount!.perfil },
      jwtSecret,
      { expiresIn: "1h" }
    );
    console.log(`   [OK] Conta admin principal confirmada: ${adminAccount!.nome} (${adminAccount!.email}) — Perfil: ${adminAccount!.perfil}`);

    // -------------------------------------------------------------------------
    // 3. ACESSO OPERACIONAL DOS 4 USUÁRIOS
    // -------------------------------------------------------------------------
    console.log("\n-> [3] Acesso dos 4 operadores às ferramentas operacionais:");

    // Bruno acessa Equipes Fixas
    const brunoTeamsRes = await fetch(`${apiBase}/fixed-teams`, {
      headers: { Authorization: `Bearer ${operatorTokens["bruno@rebuss.com"]}` },
    });
    assert(brunoTeamsRes.status === 200, `Bruno deve conseguir acessar equipes fixas (obteve ${brunoTeamsRes.status})`);
    console.log("   [OK] Bruno acessou GET /api/fixed-teams: HTTP 200");

    // Francisco acessa Gerador de Escalas
    const franciscoLocateRes = await fetch(`${apiBase}/scale-generator/locate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorTokens["francisco@rebuss.com"]}`,
      },
      body: JSON.stringify({ input: "Av. Paulista, 1578, São Paulo - SP" }),
    });
    assert(franciscoLocateRes.status === 200, `Francisco deve conseguir usar gerador de escalas (obteve ${franciscoLocateRes.status})`);
    console.log("   [OK] Francisco acessou POST /api/scale-generator/locate: HTTP 200");

    // Arthur acessa Perfil
    const arthurMeRes = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${operatorTokens["arthur@rebuss.com"]}` },
    });
    assert(arthurMeRes.status === 200, `Arthur deve conseguir acessar /auth/me (obteve ${arthurMeRes.status})`);
    console.log("   [OK] Arthur acessou GET /api/auth/me: HTTP 200");

    // Matheus acessa Equipes Fixas
    const matheusTeamsRes = await fetch(`${apiBase}/fixed-teams`, {
      headers: { Authorization: `Bearer ${operatorTokens["matheus@rebuss.com"]}` },
    });
    assert(matheusTeamsRes.status === 200, `Matheus deve conseguir acessar equipes fixas (obteve ${matheusTeamsRes.status})`);
    console.log("   [OK] Matheus acessou GET /api/fixed-teams: HTTP 200");

    // -------------------------------------------------------------------------
    // 4. BLOQUEIO ESTRITO DO PAINEL DE USUÁRIOS PARA OS 4 OPERADORES (HTTP 403)
    // -------------------------------------------------------------------------
    console.log("\n-> [4] Bloqueio estrito de acesso e APIs de usuários para operadores:");

    // Bruno tenta listar usuários
    const brunoUsersRes = await fetch(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${operatorTokens["bruno@rebuss.com"]}` },
    });
    assert(brunoUsersRes.status === 403, `Bruno deve receber 403 em GET /api/users, obteve ${brunoUsersRes.status}`);
    console.log("   [OK] Bruno bloqueado em GET /api/users: HTTP 403 Forbidden");

    // Francisco tenta criar novo usuário
    const franciscoCreateRes = await fetch(`${apiBase}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorTokens["francisco@rebuss.com"]}`,
      },
      body: JSON.stringify({
        nome: "Invasor",
        email: "invasor@teste.com",
        senha: "password123",
        perfil: "ADMIN",
      }),
    });
    assert(franciscoCreateRes.status === 403, `Francisco deve receber 403 em POST /api/users, obteve ${franciscoCreateRes.status}`);
    console.log("   [OK] Francisco bloqueado em POST /api/users: HTTP 403 Forbidden");

    // Arthur tenta alterar papel de outro usuário
    const arthurEditRes = await fetch(`${apiBase}/users/${adminAccount!.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorTokens["arthur@rebuss.com"]}`,
      },
      body: JSON.stringify({ perfil: "OPERADOR" }),
    });
    assert(arthurEditRes.status === 403, `Arthur deve receber 403 em PATCH /api/users, obteve ${arthurEditRes.status}`);
    console.log("   [OK] Arthur bloqueado em PATCH /api/users/:id: HTTP 403 Forbidden");

    // Matheus tenta desativar usuário
    const matheusStatusRes = await fetch(`${apiBase}/users/${adminAccount!.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorTokens["matheus@rebuss.com"]}`,
      },
      body: JSON.stringify({ ativo: false }),
    });
    assert(matheusStatusRes.status === 403, `Matheus deve receber 403 em PATCH /api/users/:id/status, obteve ${matheusStatusRes.status}`);
    console.log("   [OK] Matheus bloqueado em PATCH /api/users/:id/status: HTTP 403 Forbidden");

    // -------------------------------------------------------------------------
    // 5. BLOQUEIO DE ELEVAÇÃO DE PRIVILÉGIOS PELO PRÓPRIO OPERADOR
    // -------------------------------------------------------------------------
    console.log("\n-> [5] Bloqueio de auto-elevação de privilégios:");
    const elevateAttempt = await fetch(`${apiBase}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorTokens["bruno@rebuss.com"]}`,
      },
      body: JSON.stringify({ nome: "Bruno Hack", perfil: "ADMIN" }),
    });
    assert(elevateAttempt.status === 200, "Update profile deve aceitar nome");
    const brunoRecheck = await prisma.usuario.findUnique({
      where: { email: "bruno@rebuss.com" },
    });
    assert(brunoRecheck!.perfil === "OPERADOR", "Perfil de Bruno DEVE continuar OPERADOR mesmo enviando perfil: ADMIN");
    console.log("   [OK] Tentativa de elevação de perfil ignorada com segurança pelo backend.");

    // -------------------------------------------------------------------------
    // 6. ACESSO EXCLUSIVO DO ADMINISTRADOR PRINCIPAL AO PAINEL DE USUÁRIOS
    // -------------------------------------------------------------------------
    console.log("\n-> [6] Acesso exclusivo do administrador principal ao painel de usuários:");
    const adminUsersRes = await fetch(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminUsersRes.status === 200, `Admin deve receber HTTP 200 em GET /api/users, obteve ${adminUsersRes.status}`);
    const adminUsersJson = (await adminUsersRes.json()) as any;
    assert(Array.isArray(adminUsersJson.users) && adminUsersJson.users.length === 5, "Admin deve listar todos os 5 usuários");
    console.log(`   [OK] Administrador principal listou todos os ${adminUsersJson.users.length} usuários com sucesso: HTTP 200`);

    // -------------------------------------------------------------------------
    // 7. BLOQUEIO DE ACESSO NÃO AUTENTICADO
    // -------------------------------------------------------------------------
    console.log("\n-> [7] Bloqueio de rotas protegidas sem autenticação:");
    const anonRes = await fetch(`${apiBase}/users`);
    assert(anonRes.status === 401, `Acesso anônimo deve retornar 401, obteve ${anonRes.status}`);
    console.log("   [OK] Acesso sem token rejeitado com HTTP 401 Unauthorized.");

    console.log("\n==========================================================");
    console.log("  TODOS OS TESTES DE AUTENTICAÇÃO E PERMISSÕES APROVADOS!");
    console.log("==========================================================");
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

runAuthTests().catch(async (err) => {
  console.error("\n❌ FALHA NOS TESTES DE AUTENTICAÇÃO:", err);
  await prisma.$disconnect();
  process.exit(1);
});

