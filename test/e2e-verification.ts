import "dotenv/config";
import crypto from "crypto";
import prisma from "../server/src/lib/prisma.js";

const BASE_URL = "http://localhost:3001/api";
const ADMIN_EMAIL = "kelvimatosalves@gmail.com";

async function runTests() {
  console.log("==================================================");
  console.log("   INICIANDO SUÍTE DE TESTES E2E — REBUSS OPS   ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Backup admin original hash to restore after E2E test
  const adminUserBefore = await prisma.usuario.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (!adminUserBefore) {
    throw new Error(`Conta administrativa ${ADMIN_EMAIL} não encontrada no banco.`);
  }
  const originalSenhaHash = adminUserBefore.senhaHash;

  const createdTeamIds: string[] = [];
  let createdOpUserId: string | null = null;

  try {
    // 1. Test Server Health
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.status === "ok",
      "1. API Health Check responde 200 OK"
    );

    // 2. Test Password Reset Flow (Request + Confirm) with ephemeral runtime credential
    const ephemeralAdminCredential = `Tmp_${crypto.randomBytes(12).toString("hex")}!`;
    const resetReqRes = await fetch(`${BASE_URL}/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const resetReqData = await resetReqRes.json();
    assert(
      resetReqRes.status === 200 && !!resetReqData.resetToken,
      "2.1 Solicitação de token criptográfico de redefinição de senha para conta administrativa"
    );

    const resetConfirmRes = await fetch(`${BASE_URL}/auth/password-reset/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetReqData.resetToken,
        newPassword: ephemeralAdminCredential,
      }),
    });
    assert(
      resetConfirmRes.status === 200,
      "2.2 Confirmação de redefinição de senha via token de uso único"
    );

    // Verify token cannot be reused (one-time use enforcement)
    const reuseTokenRes = await fetch(`${BASE_URL}/auth/password-reset/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetReqData.resetToken,
        newPassword: ephemeralAdminCredential,
      }),
    });
    assert(
      reuseTokenRes.status === 400,
      "2.3 Bloqueio de reutilização do mesmo token de redefinição (uso único garantido)"
    );

    // 3. Test Invalid Login
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: `Wrong_${crypto.randomBytes(8).toString("hex")}`,
      }),
    });
    assert(
      badLoginRes.status === 401,
      "3. Tentativa de login inválida retorna HTTP 401 sem expor detalhes internos"
    );

    // 4. Test Valid Admin Login with kelvimatosalves@gmail.com
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ephemeralAdminCredential }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;
    assert(
      adminLoginRes.status === 200 &&
        adminLoginData.user.perfil === "ADMIN" &&
        adminLoginData.user.email === ADMIN_EMAIL &&
        !!adminToken,
      "4. Login de administrador (kelvimatosalves@gmail.com) realizado com sucesso e emissão de JWT"
    );

    // 5. Test GET /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 && meData.user.email === ADMIN_EMAIL,
      "5. Endpoint GET /api/auth/me valida o token e retorna o administrador autenticado"
    );

    // 6. Test Creating Temporary Fixed Teams and Members
    const rjTeamRes = await fetch(`${BASE_URL}/fixed-teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nome: "Equipe Temp E2E RJ",
        regiao: "RJ",
        descricao: "Teste E2E Temporário",
      }),
    });
    const rjTeam = (await rjTeamRes.json()).team;
    if (rjTeam?.id) createdTeamIds.push(rjTeam.id);
    assert(
      rjTeamRes.status === 201 && rjTeam.regiao === "RJ",
      "6. Criação de Equipe Fixa via API"
    );

    // 7. Test Member Addition with Leading Zeros
    const m1Res = await fetch(`${BASE_URL}/fixed-teams/${rjTeam.id}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nome: "Colaborador Teste 01",
        numero: "01",
        cargo: "Operador",
      }),
    });
    const m1 = (await m1Res.json()).member;

    const m2Res = await fetch(`${BASE_URL}/fixed-teams/${rjTeam.id}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nome: "Colaborador Teste 02",
        numero: "02",
        cargo: "Operador",
      }),
    });
    const m2 = (await m2Res.json()).member;

    assert(
      m1.numero === "01" && m2.numero === "02",
      "7. Membros adicionados preservando zeros à esquerda no campo número"
    );

    // 8. Test Member Reordering
    const reorderRes = await fetch(`${BASE_URL}/fixed-teams/${rjTeam.id}/members/order`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        members: [
          { id: m2.id, ordem: 1 },
          { id: m1.id, ordem: 2 },
        ],
      }),
    });
    const reorderData = await reorderRes.json();
    assert(
      reorderRes.status === 200 && reorderData.members[0].id === m2.id,
      "8. Reordenação de membros da equipe salva e persistida via transação no PostgreSQL"
    );

    // 9. Test Operator User Creation & Role-Based Access Control (RBAC)
    const ephemeralOpCredential = `Op_${crypto.randomBytes(12).toString("hex")}!`;
    const createOpRes = await fetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nome: "Operador Teste E2E",
        email: "operador.e2e@rebuss.com.br",
        senha: ephemeralOpCredential,
        perfil: "OPERADOR",
      }),
    });
    const opData = await createOpRes.json();
    if (opData.user?.id) createdOpUserId = opData.user.id;
    assert(
      createOpRes.status === 201 && opData.user.perfil === "OPERADOR",
      "9. Administrador cadastra novo usuário com perfil OPERADOR"
    );

    // Login as Operator
    const opLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "operador.e2e@rebuss.com.br",
        password: ephemeralOpCredential,
      }),
    });
    const opLoginData = await opLoginRes.json();
    const opToken = opLoginData.token;

    // Test Operator attempting to access admin route (Users) -> MUST BE 403 Forbidden
    const opForbiddenUsersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    assert(
      opForbiddenUsersRes.status === 403,
      "10. Operador é bloqueado de acessar a rota administrativa de usuários (HTTP 403 Forbidden)"
    );

    // Test Operator attempting to delete team -> MUST BE 403 Forbidden
    const opForbiddenDeleteTeamRes = await fetch(
      `${BASE_URL}/fixed-teams/${rjTeam.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${opToken}` },
      }
    );
    assert(
      opForbiddenDeleteTeamRes.status === 403,
      "11. Operador é bloqueado de excluir equipes no backend (HTTP 403 Forbidden)"
    );

    // Test Operator viewing fixed teams -> MUST BE ALLOWED (200 OK)
    const opViewTeamsRes = await fetch(`${BASE_URL}/fixed-teams`, {
      headers: { Authorization: `Bearer ${opToken}` },
    });
    const opViewTeamsData = await opViewTeamsRes.json();
    assert(
      opViewTeamsRes.status === 200 &&
        Array.isArray(opViewTeamsData.teams) &&
        opViewTeamsData.teams.length >= 24,
      "12. Operador tem permissão de leitura das equipes para consulta e cópia operacional"
    );

    // 13. Test Cascade Deletion of Temporary Team
    const deleteTeamRes = await fetch(`${BASE_URL}/fixed-teams/${rjTeam.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteTeamData = await deleteTeamRes.json();
    assert(
      deleteTeamRes.status === 200 && deleteTeamData.result.membersRemovedCount === 2,
      "13. Exclusão de equipe temporária com integridade referencial em cascata"
    );
    createdTeamIds.splice(createdTeamIds.indexOf(rjTeam.id), 1);
  } finally {
    // Restore original admin password hash and clean up any temporary test entities
    await prisma.usuario.update({
      where: { id: adminUserBefore.id },
      data: { senhaHash: originalSenhaHash },
    });

    if (createdOpUserId) {
      await prisma.usuario.deleteMany({ where: { id: createdOpUserId } });
    }
    if (createdTeamIds.length > 0) {
      await prisma.equipeFixa.deleteMany({ where: { id: { in: createdTeamIds } } });
    }
  }

  console.log("==================================================");
  console.log(`RESULTADO DOS TESTES E2E: ${passed} PASSOU | ${failed} FALHOU`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Erro fatal durante execução dos testes:", err);
  process.exit(1);
});
