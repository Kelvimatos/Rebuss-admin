import prisma from "../../lib/prisma.js";

export class DashboardService {
  async getStats() {
    const [
      totalEquipes,
      totalEquipesAtivas,
      totalMembros,
      totalFerramentas,
      atividadesRecentes,
      equipesPorRegiao,
    ] = await Promise.all([
      // Total de equipes fixas
      prisma.equipeFixa.count(),

      // Total de equipes ativas
      prisma.equipeFixa.count({
        where: { ativo: true },
      }),

      // Total de membros cadastrados
      prisma.membroEquipeFixa.count(),

      // Total de ferramentas disponíveis e ativas
      prisma.ferramenta.count({
        where: { ativo: true },
      }),

      // Atividades recentes reais
      prisma.atividade.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              perfil: true,
            },
          },
        },
      }),

      // Distribuição de equipes por região
      prisma.equipeFixa.groupBy({
        by: ["regiao"],
        _count: {
          id: true,
        },
      }),
    ]);

    // Breakdown formatted
    const regiaoStats = equipesPorRegiao.map((r) => ({
      regiao: r.regiao,
      totalEquipes: r._count.id,
    }));

    return {
      totalEquipes,
      totalEquipesAtivas,
      totalMembros,
      totalFerramentas,
      regiaoStats,
      atividadesRecentes,
    };
  }
}

export const dashboardService = new DashboardService();

