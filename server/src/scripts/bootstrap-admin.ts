import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";

async function bootstrap() {
  console.log("=== INICIALIZANDO BOOTSTRAP DO REBUSS OPS ===");

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "kelvimatosalves@gmail.com")
    .toLowerCase()
    .trim();
  const adminName = process.env.INITIAL_ADMIN_NAME || "Administrador REBUSS";

  // 1. Check if any admin already exists
  const existingAdmin = await prisma.usuario.findFirst({
    where: { perfil: "ADMIN" },
  });

  if (existingAdmin) {
    if (existingAdmin.email !== adminEmail) {
      const updatedAdmin = await prisma.usuario.update({
        where: { id: existingAdmin.id },
        data: { email: adminEmail },
      });

      await prisma.atividade.create({
        data: {
          usuarioId: updatedAdmin.id,
          tipo: "EMAIL_ADMIN_ATUALIZADO",
          descricao: `E-mail administrativo atualizado com preservação de ID e permissões para: ${updatedAdmin.email}`,
        },
      });

      console.log(`[ATUALIZADO] E-mail da conta administrativa atualizado com sucesso:`);
      console.log(`- ID Preservado: ${updatedAdmin.id}`);
      console.log(`- Nome: ${updatedAdmin.nome}`);
      console.log(`- Novo E-mail: ${updatedAdmin.email}`);
      console.log(`- Perfil: ${updatedAdmin.perfil}`);
    } else {
      console.log(`[OK] Conta administrativa já configurada e conciliada:`);
      console.log(`- ID: ${existingAdmin.id}`);
      console.log(`- Nome: ${existingAdmin.nome}`);
      console.log(`- E-mail: ${existingAdmin.email}`);
      console.log(`- Ativo: ${existingAdmin.ativo}`);
    }
  } else {
    // Use environment variable or generate a cryptographically secure random credential requiring reset
    const rawCredential =
      process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(24).toString("base64url");
    const saltRounds = 12;
    const senhaHash = await bcrypt.hash(rawCredential, saltRounds);

    const newAdmin = await prisma.usuario.create({
      data: {
        nome: adminName,
        email: adminEmail,
        senhaHash,
        perfil: "ADMIN",
        ativo: true,
      },
    });

    console.log(`[SUCESSO] Primeiro administrador criado com sucesso!`);
    console.log(`- ID: ${newAdmin.id}`);
    console.log(`- Nome: ${newAdmin.nome}`);
    console.log(`- E-mail: ${newAdmin.email}`);
    console.log(`- Perfil: ${newAdmin.perfil}`);
    if (!process.env.INITIAL_ADMIN_PASSWORD) {
      console.log(
        `[SEGURANÇA] Utilize o fluxo de redefinição de senha na tela de login para definir sua credencial.`
      );
    }

    await prisma.atividade.create({
      data: {
        usuarioId: newAdmin.id,
        tipo: "SISTEMA_INICIALIZADO",
        descricao: `Primeiro administrador configurado via script de bootstrap: ${newAdmin.email}`,
      },
    });
  }

  // 2. Ensure initial tools catalog is populated
  const toolsToSeed = [
    {
      nome: "Equipes Fixas",
      descricao:
        "Gerenciamento completo das equipes operacionais fixas por região (RJ, SP, SJC), membros, ordenação e cópia rápida.",
      slug: "equipes-fixas",
      icone: "Users",
      rota: "/tools/equipes-fixas",
      ordem: 1,
      ativo: true,
    },
    {
      nome: "Gerador de Escalas",
      descricao:
        "Geração inteligente de escalas com geolocalização e estações de transporte público próximas.",
      slug: "gerador-de-escalas",
      icone: "Calendar",
      rota: "/tools/gerador-de-escalas",
      ordem: 2,
      ativo: true,
    },
  ];

  for (const tool of toolsToSeed) {
    const existingTool = await prisma.ferramenta.findUnique({
      where: { slug: tool.slug },
    });

    if (!existingTool) {
      await prisma.ferramenta.create({
        data: tool,
      });
      console.log(`[FERRAMENTA] Registrada no catálogo: ${tool.nome} (${tool.slug})`);
    }
  }

  console.log("=== BOOTSTRAP CONCLUÍDO COM SUCESSO ===");
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error("Erro fatal durante bootstrap:", error);
  process.exit(1);
});
