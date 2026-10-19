import prisma from "../../lib/prisma.js";

export class ToolsService {
  async listTools() {
    return prisma.ferramenta.findMany({
      orderBy: { ordem: "asc" },
    });
  }

  async getActiveTools() {
    return prisma.ferramenta.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
    });
  }
}

export const toolsService = new ToolsService();

