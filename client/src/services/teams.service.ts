import { api } from "./api.js";
import { EquipeFixa, MembroEquipeFixa } from "../types/index.js";

export const teamsService = {
  async getTeams(params?: { search?: string; regiao?: string; ativo?: string }): Promise<EquipeFixa[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.regiao && params.regiao !== "ALL") query.append("regiao", params.regiao);
    if (params?.ativo && params.ativo !== "all") query.append("ativo", params.ativo);

    const queryString = query.toString();
    const endpoint = `/fixed-teams${queryString ? `?${queryString}` : ""}`;
    const res = await api.get<{ success: boolean; teams: EquipeFixa[] }>(endpoint);
    return res.teams;
  },

  async getTeamById(id: string): Promise<EquipeFixa> {
    const res = await api.get<{ success: boolean; team: EquipeFixa }>(`/fixed-teams/${id}`);
    return res.team;
  },

  async createTeam(data: {
    nome: string;
    regiao: string;
    supervisor?: string | null;
    descricao?: string | null;
    ativo?: boolean;
  }): Promise<EquipeFixa> {
    const res = await api.post<{ success: boolean; team: EquipeFixa }>("/fixed-teams", data);
    return res.team;
  },

  async updateTeam(
    id: string,
    data: Partial<{
      nome: string;
      regiao: string;
      supervisor?: string | null;
      descricao?: string | null;
      ativo?: boolean;
    }>
  ): Promise<EquipeFixa> {
    const res = await api.patch<{ success: boolean; team: EquipeFixa }>(`/fixed-teams/${id}`, data);
    return res.team;
  },

  async deleteTeam(id: string): Promise<{ id: string; nome: string; membersRemovedCount: number }> {
    const res = await api.delete<{
      success: boolean;
      result: { id: string; nome: string; membersRemovedCount: number };
    }>(`/fixed-teams/${id}`);
    return res.result;
  },

  // Member operations
  async addMember(
    teamId: string,
    data: {
      nome: string;
      cargo?: string;
      funcao?: string;
      matricula?: string | null;
      numero?: string | null;
      ordem?: number;
    }
  ): Promise<MembroEquipeFixa> {
    const res = await api.post<{ success: boolean; member: MembroEquipeFixa }>(
      `/fixed-teams/${teamId}/members`,
      data
    );
    return res.member;
  },

  async updateMember(
    teamId: string,
    memberId: string,
    data: Partial<{
      nome: string;
      cargo?: string;
      funcao?: string;
      matricula?: string | null;
      numero?: string | null;
      ordem?: number;
    }>
  ): Promise<MembroEquipeFixa> {
    const res = await api.patch<{ success: boolean; member: MembroEquipeFixa }>(
      `/fixed-teams/${teamId}/members/${memberId}`,
      data
    );
    return res.member;
  },

  async deleteMember(teamId: string, memberId: string): Promise<{ id: string; nome: string }> {
    const res = await api.delete<{ success: boolean; result: { id: string; nome: string } }>(
      `/fixed-teams/${teamId}/members/${memberId}`
    );
    return res.result;
  },

  async reorderMembers(
    teamId: string,
    members: { id: string; ordem: number }[]
  ): Promise<MembroEquipeFixa[]> {
    const res = await api.patch<{ success: boolean; members: MembroEquipeFixa[] }>(
      `/fixed-teams/${teamId}/members/order`,
      { members }
    );
    return res.members;
  },
};
