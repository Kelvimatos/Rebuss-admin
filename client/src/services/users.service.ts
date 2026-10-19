import { api } from "./api.js";
import { User, Perfil } from "../types/index.js";

export const usersService = {
  async getUsers(): Promise<User[]> {
    const res = await api.get<{ success: boolean; users: User[] }>("/users");
    return res.users;
  },

  async createUser(data: {
    nome: string;
    email: string;
    senha: string;
    perfil: Perfil;
    ativo?: boolean;
  }): Promise<User> {
    const res = await api.post<{ success: boolean; user: User }>("/users", data);
    return res.user;
  },

  async updateUser(
    id: string,
    data: Partial<{
      nome: string;
      email: string;
      senha: string;
      perfil: Perfil;
      ativo: boolean;
    }>
  ): Promise<User> {
    const res = await api.patch<{ success: boolean; user: User }>(`/users/${id}`, data);
    return res.user;
  },

  async updateUserStatus(id: string, ativo: boolean): Promise<User> {
    const res = await api.patch<{ success: boolean; user: User }>(`/users/${id}/status`, {
      ativo,
    });
    return res.user;
  },
};

