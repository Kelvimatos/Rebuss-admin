import { api } from "./api.js";
import { User } from "../types/index.js";

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await api.post<{ success: boolean; user: User; token: string }>(
      "/auth/login",
      { email, password }
    );
    if (response.token) {
      localStorage.setItem("rebuss_token", response.token);
    }
    if (response.user) {
      localStorage.setItem("rebuss_user", JSON.stringify(response.user));
    }
    return response;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("rebuss_token");
      localStorage.removeItem("rebuss_user");
    }
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ success: boolean; user: User }>("/auth/me");
    if (response.user) {
      localStorage.setItem("rebuss_user", JSON.stringify(response.user));
    }
    return response.user;
  },

  async updateProfile(nome: string): Promise<User> {
    const response = await api.patch<{ success: boolean; user: User }>("/auth/profile", {
      nome,
    });
    if (response.user) {
      localStorage.setItem("rebuss_user", JSON.stringify(response.user));
    }
    return response.user;
  },

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append("avatar", file);

    const token = localStorage.getItem("rebuss_token");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/auth/profile/avatar", {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Erro ao fazer upload da imagem.");
    }

    if (data.user) {
      localStorage.setItem("rebuss_user", JSON.stringify(data.user));
    }
    return data.user;
  },

  async removeAvatar(): Promise<User> {
    const response = await api.delete<{ success: boolean; user: User }>(
      "/auth/profile/avatar"
    );
    if (response.user) {
      localStorage.setItem("rebuss_user", JSON.stringify(response.user));
    }
    return response.user;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch<{ success: boolean; message: string }>("/auth/profile/password", {
      currentPassword,
      newPassword,
    });
  },

  async requestPasswordReset(email: string): Promise<{ resetToken?: string | null; devResetToken?: string | null; message: string }> {
    return api.post<{ success: boolean; resetToken?: string | null; devResetToken?: string | null; message: string }>(
      "/auth/password-reset/request",
      { email }
    );
  },

  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    return api.post<{ success: boolean; message: string }>(
      "/auth/password-reset/confirm",
      { token, newPassword }
    );
  },
};
