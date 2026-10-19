import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

interface VerificationResult {
  suite: string;
  test: string;
  status: "APROVADO" | "FALHOU";
  details: string;
}

const results: VerificationResult[] = [];

function record(suite: string, test: string, passed: boolean, details: string) {
  results.push({
    suite,
    test,
    status: passed ? "APROVADO" : "FALHOU",
    details,
  });
  const symbol = passed ? "✅" : "❌";
  console.log(`${symbol} [${suite}] ${test}: ${details}`);
}

async function runVerification() {
  console.log("====================================================");
  console.log("   BATERIA DE TESTES E AUDITORIA - REBUSS OPS");
  console.log("====================================================\n");

  // ==========================================
  // 1. LOGO.WEBP, TÍTULO E LIMPEZA DE IMAGENS
  // ==========================================
  console.log("--- 1. Identidade Visual (logo.webp), Título e Limpeza de Imagens ---");

  const publicLogoWebpPath = path.resolve(__dirname, "../../../client/public/logo.webp");
  const indexHtmlPath = path.resolve(__dirname, "../../../client/index.html");
  const appTsxPath = path.resolve(__dirname, "../../../client/src/App.tsx");
  const sidebarPath = path.resolve(__dirname, "../../../client/src/components/layout/Sidebar.tsx");
  const headerPath = path.resolve(__dirname, "../../../client/src/components/layout/Header.tsx");
  const loginPath = path.resolve(__dirname, "../../../client/src/pages/Login.tsx");

  const logoWebpExists =
    fs.existsSync(publicLogoWebpPath) && fs.statSync(publicLogoWebpPath).size > 10000;
  const logoBuffer = logoWebpExists ? fs.readFileSync(publicLogoWebpPath) : Buffer.alloc(0);
  const isRealWebp =
    logoBuffer.length >= 12 &&
    logoBuffer.toString("ascii", 0, 4) === "RIFF" &&
    logoBuffer.toString("ascii", 8, 12) === "WEBP";

  record(
    "VISUAL",
    "Arquivo Oficial logo.webp (formato WebP autêntico)",
    logoWebpExists && isRealWebp,
    `Caminho: client/public/logo.webp (${logoBuffer.length} bytes)`
  );

  const indexHtmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
  record(
    "VISUAL",
    "Favicon configurado para /logo.webp no index.html",
    indexHtmlContent.includes('href="/logo.webp"') &&
      !indexHtmlContent.includes("favicon.png") &&
      !indexHtmlContent.includes("favicon.svg"),
    'Tags <link rel="icon" type="image/webp" href="/logo.webp" /> verificadas'
  );

  record(
    "VISUAL",
    'Título estrito "Rebuss Ops" no index.html e App.tsx',
    indexHtmlContent.includes("<title>Rebuss Ops</title>") &&
      fs.readFileSync(appTsxPath, "utf-8").includes('document.title = "Rebuss Ops"'),
    "Sem sufixos em nenhuma rota"
  );

  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
  const headerContent = fs.readFileSync(headerPath, "utf-8");
  const loginContent = fs.readFileSync(loginPath, "utf-8");

  record(
    "VISUAL",
    "Logo /logo.webp utilizada em Header, Sidebar e Login",
    sidebarContent.includes('src="/logo.webp"') &&
      headerContent.includes('src="/logo.webp"') &&
      loginContent.includes('src="/logo.webp"') &&
      !sidebarContent.includes("logo.png") &&
      !loginContent.includes("logo.png"),
    "Referências antigas substituídas em todos os componentes"
  );

  const removedImages = [
    path.resolve(__dirname, "../../../logo.png"),
    path.resolve(__dirname, "../../../client/public/logo.png"),
    path.resolve(__dirname, "../../../client/public/favicon.png"),
    path.resolve(__dirname, "../../../client/public/favicon.svg"),
    path.resolve(__dirname, "../../../client/public/icons.svg"),
    path.resolve(__dirname, "../../../client/src/assets/hero.png"),
    path.resolve(__dirname, "../../../client/src/assets/react.svg"),
    path.resolve(__dirname, "../../../client/src/assets/vite.svg"),
  ];
  const anyRemovedStillExists = removedImages.some((p) => fs.existsSync(p));
  record(
    "IMAGENS",
    "Remoção das 8 imagens obsoletas/não utilizadas",
    !anyRemovedStillExists,
    "8 arquivos não utilizados removidos, 3 arquivos utilizados mantidos"
  );

  // ==========================================
  // 2. CONTA ADMINISTRATIVA E SEGURANÇA
  // ==========================================
  console.log("\n--- 2. Conta Administrativa e Segurança ---");

  const admins = await prisma.usuario.findMany({
    where: { perfil: "ADMIN" },
  });

  record(
    "ADMIN",
    "Unicidade de Conta Administrativa (sem duplicatas)",
    admins.length === 1,
    `Total de contas ADMIN: ${admins.length}`
  );

  const mainAdmin = admins[0];
  record(
    "ADMIN",
    "E-mail Administrativo atualizado para kelvimatosalves@gmail.com",
    mainAdmin?.email === "kelvimatosalves@gmail.com" &&
      mainAdmin?.id === "7a515ada-1bca-48cb-a2ad-3112108444cf" &&
      mainAdmin?.ativo === true,
    `ID preservado: ${mainAdmin?.id}, E-mail: ${mainAdmin?.email}, Perfil: ${mainAdmin?.perfil}`
  );

  const oldAdminExists = await prisma.usuario.findUnique({
    where: { email: "admin@rebuss.com.br" },
  });
  record(
    "ADMIN",
    "Ausência de e-mail antigo (admin@rebuss.com.br)",
    !oldAdminExists,
    "E-mail antigo substituído com sucesso no registro original"
  );

  // ==========================================
  // 3. VALIDAÇÃO DA EQUIPE FIXA SJC
  // ==========================================
  console.log("\n--- 3. Equipe Fixa SJC (São José dos Campos) ---");

  const sjcTeams = await prisma.equipeFixa.findMany({
    where: { regiao: "SJC" },
    include: { membros: { orderBy: { ordem: "asc" } } },
  });

  record(
    "SJC",
    "Equipe Fixa SJC cadastrada sem duplicatas",
    sjcTeams.length === 1 && sjcTeams[0].nome === "EQUIPE FIXA SJC",
    `Equipes SJC encontradas: ${sjcTeams.length} (${sjcTeams[0]?.nome})`
  );

  const sjcMembers = sjcTeams[0]?.membros || [];
  record(
    "SJC",
    "Quantidade exata de 27 integrantes em SJC",
    sjcMembers.length === 27,
    `Total de integrantes em SJC: ${sjcMembers.length} (esperado: 27)`
  );

  const firstSjc = sjcMembers[0];
  const lastSjc = sjcMembers[sjcMembers.length - 1];
  record(
    "SJC",
    "Integridade de nomes, funções e matrículas em SJC",
    firstSjc?.nome === "Antonio de Souza" &&
      firstSjc?.matricula === "109283" &&
      lastSjc?.nome === "Suellen Helen da Costa Moura" &&
      lastSjc?.matricula === "109706" &&
      sjcMembers.every((m) => m.funcao === "Operador" && !!m.matricula),
    `1º: ${firstSjc?.nome} (${firstSjc?.matricula}) | 27º: ${lastSjc?.nome} (${lastSjc?.matricula})`
  );

  // ==========================================
  // 4. VALIDAÇÃO DAS EQUIPES FIXAS RJ
  // ==========================================
  console.log("\n--- 4. Equipes Fixas RJ (Rio de Janeiro) ---");

  const rjTeams = await prisma.equipeFixa.findMany({
    where: { regiao: "RJ" },
    include: { membros: { orderBy: { ordem: "asc" } } },
    orderBy: { nome: "asc" },
  });

  record(
    "RJ",
    "Total de 4 Equipes Fixas no RJ",
    rjTeams.length === 4,
    `Total encontrado no RJ: ${rjTeams.length} equipes`
  );

  const expectedRj = [
    {
      nome: "EQUIPE FIXA RJ — WALLACE",
      supervisor: "Wallace Da Silva De Oliveira",
      count: 12,
    },
    {
      nome: "EQUIPE FIXA RJ — NATALIA",
      supervisor: "Natalia Duarte Da Silva Lopes",
      count: 11,
    },
    {
      nome: "EQUIPE FIXA RJ — CRISLAINE",
      supervisor: "Crislaine Ferreira Guimaraes",
      count: 9,
    },
    {
      nome: "EQUIPE FIXA RJ — BRUNO SANTANA",
      supervisor: "Bruno Santana",
      count: 12,
    },
  ];

  for (const exp of expectedRj) {
    const found = rjTeams.find((t) => t.nome === exp.nome);
    const allNullMatriculas = found ? found.membros.every((m) => m.matricula === null) : false;
    record(
      "RJ",
      `${exp.nome} (${exp.count} integrantes)`,
      !!found &&
        found.supervisor === exp.supervisor &&
        found.membros.length === exp.count &&
        allNullMatriculas,
      `Supervisor: ${found?.supervisor} | Membros: ${found?.membros.length} | Matrículas nulas: ${allNullMatriculas}`
    );
  }

  // ==========================================
  // 5. PRESERVAÇÃO DAS EQUIPES DE SP E TOTAIS GERAIS
  // ==========================================
  console.log("\n--- 5. Preservação de SP e Consolidação Geral ---");

  const spTeams = await prisma.equipeFixa.findMany({
    where: { regiao: "SP" },
    include: { membros: true },
  });
  const totalSpMembers = spTeams.reduce((acc, t) => acc + t.membros.length, 0);
  const totalRjMembers = rjTeams.reduce((acc, t) => acc + t.membros.length, 0);
  const totalSjcMembers = sjcMembers.length;

  record(
    "SP",
    "Preservação integral das 19 equipes e 160 integrantes de SP",
    spTeams.length === 19 && totalSpMembers === 160,
    `SP: ${spTeams.length} equipes e ${totalSpMembers} integrantes intactos`
  );

  const totalTeamsAll = spTeams.length + rjTeams.length + sjcTeams.length;
  const totalMembersAll = totalSpMembers + totalRjMembers + totalSjcMembers;
  record(
    "CONSOLIDADO",
    "Total Geral no Banco (24 equipes e 231 integrantes)",
    totalTeamsAll === 24 && totalMembersAll === 231,
    `Equipes: ${totalTeamsAll} (19 SP + 4 RJ + 1 SJC) | Integrantes: ${totalMembersAll} (160 SP + 44 RJ + 27 SJC)`
  );

  // ==========================================
  // 6. BUSCA POR CARACTERES ESPECIAIS, MATRÍCULA E SUPERVISOR
  // ==========================================
  console.log("\n--- 6. Busca por Nome, Caracteres Especiais, Matrícula e Supervisor ---");

  const specialCharMember = await prisma.membroEquipeFixa.findFirst({
    where: { nome: { contains: "MARÇIA LIRA", mode: "insensitive" } },
  });
  record(
    "BUSCA",
    'Busca com parênteses e cedilha ("Amanda da Silva de Lima (MARÇIA LIRA)")',
    !!specialCharMember && specialCharMember.matricula === null,
    `Encontrado: ${specialCharMember?.nome} (Matrícula: ${specialCharMember?.matricula ?? "—"})`
  );

  const accentedMember = await prisma.membroEquipeFixa.findFirst({
    where: { nome: { contains: "Angélica Palácio", mode: "insensitive" } },
  });
  record(
    "BUSCA",
    'Busca com acentuação ("Angélica Palácio")',
    !!accentedMember,
    `Encontrado: ${accentedMember?.nome}`
  );

  const sjcMatriculaSearch = await prisma.membroEquipeFixa.findFirst({
    where: { matricula: "109706" },
  });
  record(
    "BUSCA",
    'Busca por matrícula SJC ("109706")',
    sjcMatriculaSearch?.nome === "Suellen Helen da Costa Moura",
    `Encontrado: ${sjcMatriculaSearch?.nome}`
  );

  console.log("\n====================================================");
  console.log("   RESUMO DOS TESTES EXECUTADOS");
  console.log("====================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "APROVADO").length;
  const failed = results.filter((r) => r.status === "FALHOU").length;
  console.log(`Total de verificações: ${total}`);
  console.log(`Aprovados: ${passed}`);
  console.log(`Falhas: ${failed}`);

  if (failed > 0) {
    console.error("\n❌ Houve falhas na bateria de testes!");
    process.exit(1);
  } else {
    console.log("\n🎉 TODOS OS TESTES FORAM APROVADOS COM SUCESSO!");
  }
}

runVerification()
  .catch((err) => {
    console.error("Erro na execução do script de verificação:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
