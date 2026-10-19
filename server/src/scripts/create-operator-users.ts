import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

interface NewOperator {
  nome: string;
  email: string;
  senhaInicial: string;
}

const OPERATORS_TO_SEED: NewOperator[] = [
  { nome: "Bruno", email: "bruno@rebuss.com", senhaInicial: "1234" },
  { nome: "Francisco", email: "francisco@rebuss.com", senhaInicial: "1234" },
  { nome: "Arthur", email: "arthur@rebuss.com", senhaInicial: "1234" },
  { nome: "Matheus", email: "matheus@rebuss.com", senhaInicial: "1234" },
];

export async function createOperatorUsers() {
  console.log("==========================================================");
  console.log("  REBUSS OPS — CRIAÇÃO DAS CONTAS OPERACIONAIS");
  console.log("==========================================================\n");

  const results: any[] = [];

  for (const op of OPERATORS_TO_SEED) {
    const emailNorm = op.email.toLowerCase().trim();
    const existing = await prisma.usuario.findUnique({
      where: { email: emailNorm },
    });

    if (existing) {
      console.log(`[INFO] Usuário ${op.nome} (${emailNorm}) já existe no banco. Verificando integridade...`);
      // Update password hash if needed to guarantee 1234 initial login
      const isMatch = await bcrypt.compare(op.senhaInicial, existing.senhaHash);
      if (!isMatch) {
        const newHash = await bcrypt.hash(op.senhaInicial, 10);
        await prisma.usuario.update({
          where: { id: existing.id },
          data: { senhaHash: newHash, ativo: true, perfil: "OPERADOR" },
        });
        console.log(`       -> Senha inicial redefinida para ${op.senhaInicial} e perfil garantido como OPERADOR.`);
      }
      results.push({ ...existing, action: "EXISTED_UPDATED" });
    } else {
      const senhaHash = await bcrypt.hash(op.senhaInicial, 10);
      const created = await prisma.usuario.create({
        data: {
          nome: op.nome,
          email: emailNorm,
          senhaHash,
          perfil: "OPERADOR",
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
          ativo: true,
          createdAt: true,
        },
      });
      console.log(`[SUCESSO] Conta criada: ${created.nome} (${created.email}) — Perfil: ${created.perfil}`);
      results.push({ ...created, action: "CREATED" });
    }
  }

  console.log("\n-> Verificação dos usuários cadastrados no banco:");
  const allUsers = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, perfil: true, ativo: true },
    orderBy: { nome: "asc" },
  });
  console.table(allUsers);

  return results;
}

if (process.argv[1]?.endsWith("create-operator-users.ts") || process.argv[1]?.endsWith("create-operator-users.js")) {
  createOperatorUsers()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Erro ao criar usuários:", err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

