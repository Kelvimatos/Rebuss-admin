import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { registrarAtividade } from "../../lib/audit.js";
import {
  CreateTeamInput,
  UpdateTeamInput,
  QueryTeamsInput,
  CreateMemberInput,
  UpdateMemberInput,
  ReorderMembersInput,
} from "./fixed-teams.schemas.js";

export class FixedTeamsService {
  async listTeams(filters: QueryTeamsInput) {
    const where: Prisma.EquipeFixaWhereInput = {};

    if (filters.regiao && filters.regiao !== "ALL") {
      where.regiao = filters.regiao.toUpperCase();
    }

    if (filters.ativo !== undefined) {
      where.ativo =
        typeof filters.ativo === "boolean"
          ? filters.ativo
          : String(filters.ativo).toLowerCase() === "true";
    }

    if (filters.search && filters.search.trim() !== "") {
      const search = filters.search.trim();
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { supervisor: { contains: search, mode: "insensitive" } },
        { descricao: { contains: search, mode: "insensitive" } },
        {
          membros: {
            some: {
              OR: [
                { nome: { contains: search, mode: "insensitive" } },
                { matricula: { contains: search, mode: "insensitive" } },
                { numero: { contains: search, mode: "insensitive" } },
                { cargo: { contains: search, mode: "insensitive" } },
                { funcao: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    return prisma.equipeFixa.findMany({
      where,
      include: {
        membros: {
          orderBy: [
            { ordem: "asc" },
            { createdAt: "asc" },
          ],
        },
        createdBy: {
          select: {
            id: true,
            nome: true,
          },
        },
        _count: {
          select: {
            membros: true,
          },
        },
      },
      orderBy: [
        { regiao: "asc" },
        { nome: "asc" },
      ],
    });
  }

  async getTeamById(id: string) {
    const team = await prisma.equipeFixa.findUnique({
      where: { id },
      include: {
        membros: {
          orderBy: [
            { ordem: "asc" },
            { createdAt: "asc" },
          ],
        },
        createdBy: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!team) {
      const err = new Error("Equipe fixa não encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    return team;
  }

  async createTeam(input: CreateTeamInput, actorId?: string) {
    const team = await prisma.equipeFixa.create({
      data: {
        nome: input.nome.trim(),
        regiao: input.regiao.trim().toUpperCase(),
        supervisor: input.supervisor ? input.supervisor.trim() : null,
        descricao: input.descricao ? input.descricao.trim() : null,
        ativo: input.ativo,
        createdById: actorId || null,
      },
      include: {
        membros: true,
        createdBy: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "EQUIPE_CRIADA",
      descricao: `Equipe "${team.nome}" criada na região ${team.regiao}`,
    });

    return team;
  }

  async updateTeam(id: string, input: UpdateTeamInput, actorId?: string) {
    const existing = await prisma.equipeFixa.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error("Equipe não encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    const data: Prisma.EquipeFixaUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome.trim();
    if (input.regiao !== undefined) data.regiao = input.regiao.trim().toUpperCase();
    if (input.supervisor !== undefined) data.supervisor = input.supervisor ? input.supervisor.trim() : null;
    if (input.descricao !== undefined) data.descricao = input.descricao ? input.descricao.trim() : null;
    if (input.ativo !== undefined) data.ativo = input.ativo;

    const updated = await prisma.equipeFixa.update({
      where: { id },
      data,
      include: {
        membros: {
          orderBy: [
            { ordem: "asc" },
            { createdAt: "asc" },
          ],
        },
        createdBy: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "EQUIPE_ATUALIZADA",
      descricao: `Equipe "${updated.nome}" foi atualizada`,
    });

    return updated;
  }

  async deleteTeam(id: string, actorId?: string) {
    const existing = await prisma.equipeFixa.findUnique({
      where: { id },
      include: {
        _count: {
          select: { membros: true },
        },
      },
    });

    if (!existing) {
      const err = new Error("Equipe não encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    const membersCount = existing._count.membros;

    await prisma.equipeFixa.delete({
      where: { id },
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "EQUIPE_EXCLUIDA",
      descricao: `Equipe "${existing.nome}" (${existing.regiao}) excluída com ${membersCount} membro(s) vinculados`,
    });

    return {
      id,
      nome: existing.nome,
      membersRemovedCount: membersCount,
    };
  }

  // Member operations
  async addMember(teamId: string, input: CreateMemberInput, actorId?: string) {
    const team = await prisma.equipeFixa.findUnique({ where: { id: teamId } });
    if (!team) {
      const err = new Error("Equipe não encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    // Determine order if not specified
    let ordem = input.ordem;
    if (ordem === undefined) {
      const lastMember = await prisma.membroEquipeFixa.findFirst({
        where: { equipeId: teamId },
        orderBy: { ordem: "desc" },
      });
      ordem = (lastMember?.ordem ?? 0) + 1;
    }

    const cargoFinal = input.funcao?.trim() || input.cargo?.trim() || "Operador";
    const numeroStr = input.numero?.trim() || (ordem < 10 ? `0${ordem}` : `${ordem}`);

    const member = await prisma.membroEquipeFixa.create({
      data: {
        equipeId: teamId,
        nome: input.nome.trim(),
        numero: numeroStr,
        matricula: input.matricula?.trim() ? input.matricula.trim() : null,
        cargo: cargoFinal,
        funcao: cargoFinal,
        ordem,
      },
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "MEMBRO_ADICIONADO",
      descricao: `Membro "${member.nome}" (${member.cargo}) adicionado à equipe "${team.nome}"`,
    });

    return member;
  }

  async updateMember(teamId: string, memberId: string, input: UpdateMemberInput, actorId?: string) {
    const member = await prisma.membroEquipeFixa.findFirst({
      where: { id: memberId, equipeId: teamId },
    });

    if (!member) {
      const err = new Error("Membro não encontrado nesta equipe.");
      (err as any).statusCode = 404;
      throw err;
    }

    const data: Prisma.MembroEquipeFixaUpdateInput = {};
    if (input.nome !== undefined) data.nome = input.nome.trim();
    if (input.numero !== undefined) data.numero = input.numero?.trim() || null;
    if (input.matricula !== undefined) data.matricula = input.matricula?.trim() ? input.matricula.trim() : null;
    if (input.funcao !== undefined || input.cargo !== undefined) {
      const c = input.funcao?.trim() || input.cargo?.trim() || member.cargo;
      data.cargo = c;
      data.funcao = c;
    }
    if (input.ordem !== undefined) data.ordem = input.ordem;

    const updated = await prisma.membroEquipeFixa.update({
      where: { id: memberId },
      data,
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "MEMBRO_ATUALIZADO",
      descricao: `Membro "${updated.nome}" atualizado`,
    });

    return updated;
  }

  async deleteMember(teamId: string, memberId: string, actorId?: string) {
    const member = await prisma.membroEquipeFixa.findFirst({
      where: { id: memberId, equipeId: teamId },
      include: { equipe: true },
    });

    if (!member) {
      const err = new Error("Membro não encontrado nesta equipe.");
      (err as any).statusCode = 404;
      throw err;
    }

    await prisma.membroEquipeFixa.delete({
      where: { id: memberId },
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "MEMBRO_REMOVIDO",
      descricao: `Membro "${member.nome}" removido da equipe "${member.equipe.nome}"`,
    });

    return { id: memberId, nome: member.nome };
  }

  async reorderMembers(teamId: string, input: ReorderMembersInput, actorId?: string) {
    const team = await prisma.equipeFixa.findUnique({ where: { id: teamId } });
    if (!team) {
      const err = new Error("Equipe não encontrada.");
      (err as any).statusCode = 404;
      throw err;
    }

    await prisma.$transaction(
      input.members.map((item) =>
        prisma.membroEquipeFixa.updateMany({
          where: {
            id: item.id,
            equipeId: teamId,
          },
          data: {
            ordem: item.ordem,
          },
        })
      )
    );

    const reordered = await prisma.membroEquipeFixa.findMany({
      where: { equipeId: teamId },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "MEMBROS_REORDENADOS",
      descricao: `Ordem dos membros da equipe "${team.nome}" foi atualizada`,
    });

    return reordered;
  }
}

export const fixedTeamsService = new FixedTeamsService();
