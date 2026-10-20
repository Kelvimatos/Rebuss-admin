import { api, API_BASE_URL } from "./api.js";
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
    // Converte a imagem para Base64 otimizado (max 320x320)
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 320;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const token = localStorage.getItem("rebuss_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: "POST",
        headers,
        body: JSON.stringify({ avatar: dataUri }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.user) {
        data.user.avatarUrl = data.user.avatarUrl || dataUri;
        localStorage.setItem("rebuss_user", JSON.stringify(data.user));
        return data.user;
      }
    } catch {
      // continua para fallback local garantido
    }

    const cachedUser = JSON.parse(localStorage.getItem("rebuss_user") || "{}");
    const updatedUser: User = {
      ...cachedUser,
      avatarUrl: dataUri,
    };
    localStorage.setItem("rebuss_user", JSON.stringify(updatedUser));
    return updatedUser;
  },

  async removeAvatar(): Promise<User> {
    const token = localStorage.getItem("rebuss_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
    } catch {
      // fallback
    }

    const cachedUser = JSON.parse(localStorage.getItem("rebuss_user") || "{}");
    const updatedUser: User = {
      ...cachedUser,
      avatarUrl: null,
    };
    localStorage.setItem("rebuss_user", JSON.stringify(updatedUser));
    return updatedUser;
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
