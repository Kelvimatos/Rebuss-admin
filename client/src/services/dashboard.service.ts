import { api } from "./api.js";
import { DashboardStats, Ferramenta } from "../types/index.js";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const res = await api.get<{ success: boolean; stats: DashboardStats }>("/dashboard/stats");
    return res.stats;
  },

  async getTools(): Promise<Ferramenta[]> {
    const res = await api.get<{ success: boolean; tools: Ferramenta[] }>("/tools");
    return res.tools;
  },
};

