import prisma from "./prisma.js";

export async function registrarAtividade(params: {
  usuarioId?: string | null;
  tipo: string;
  descricao: string;
  detalhes?: string;
}) {
  try {
    await prisma.atividade.create({
      data: {
        usuarioId: params.usuarioId || null,
        tipo: params.tipo,
        descricao: params.descricao,
        detalhes: params.detalhes || null,
      },
    });
  } catch (error) {
    console.error("Falha ao registrar atividade de auditoria:", error);
  }
}

