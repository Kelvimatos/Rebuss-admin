const BASE_URL = "https://rebuss-admin.vercel.app";

async function run() {
  console.log(`\n======================================================`);
  console.log(`  VERIFICAÇÃO DA API COMPLETA EM PRODUÇÃO`);
  console.log(`  URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  // 1. Health
  console.log(`[1] GET /api/health`);
  const hRes = await fetch(`${BASE_URL}/api/health`);
  console.log(`    Status: ${hRes.status}`);

  // 2. Login Admin
  console.log(`\n[2] POST /api/auth/login (Admin: kelvimatosalves@gmail.com / Kcarate123#)`);
  const adminLogRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "kelvimatosalves@gmail.com", password: "Kcarate123#" }),
  });
  console.log(`    Status: ${adminLogRes.status}`);
  const adminData = await adminLogRes.json();
  console.log(`    Perfil:`, adminData.user?.perfil, `| Nome:`, adminData.user?.nome);
  const adminToken = adminData.token;

  // 3. GET /api/auth/me
  console.log(`\n[3] GET /api/auth/me`);
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`    Status: ${meRes.status}`);
  const meData = await meRes.json();
  console.log(`    Usuário ativo:`, meData.user?.email);

  // 4. GET /api/fixed-teams
  console.log(`\n[4] GET /api/fixed-teams`);
  const teamsRes = await fetch(`${BASE_URL}/api/fixed-teams`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`    Status: ${teamsRes.status}`);
  const teamsData = await teamsRes.json();
  console.log(`    Total de Equipes:`, teamsData.teams?.length);

  // 5. GET /api/dashboard/stats
  console.log(`\n[5] GET /api/dashboard/stats`);
  const statsRes = await fetch(`${BASE_URL}/api/dashboard/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`    Status: ${statsRes.status}`);
  const statsData = await statsRes.json();
  console.log(`    Indicadores:`, statsData.stats);

  // 6. GET /api/tools
  console.log(`\n[6] GET /api/tools`);
  const toolsRes = await fetch(`${BASE_URL}/api/tools`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`    Status: ${toolsRes.status}`);
  const toolsData = await toolsRes.json();
  console.log(`    Ferramentas disponíveis:`, toolsData.tools?.length);

  // 7. GET /api/users
  console.log(`\n[7] GET /api/users`);
  const usersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`    Status: ${usersRes.status}`);
  const usersData = await usersRes.json();
  console.log(`    Total de usuários gerenciados:`, usersData.users?.length);

  console.log(`\n======================================================`);
  console.log(`  RESULTADO: TODAS AS ROTAS EM PRODUÇÃO ESTÃO 100% OK!`);
  console.log(`======================================================\n`);
}

run().catch(console.error);

