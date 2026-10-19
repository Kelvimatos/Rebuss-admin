import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "../types/index.js";
import { authService } from "../services/auth.service.js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfileName: (nome: string) => Promise<User>;
  updateAvatar: (file: File) => Promise<User>;
  removeAvatar: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("rebuss_user");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = await authService.getMe();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const fresh = await authService.getMe();
      setUser(fresh);
    } catch {
      // ignore
    }
  };

  const updateProfileName = async (nome: string) => {
    const updated = await authService.updateProfile(nome);
    setUser(updated);
    return updated;
  };

  const updateAvatar = async (file: File) => {
    const updated = await authService.uploadAvatar(file);
    setUser(updated);
    return updated;
  };

  const removeAvatar = async () => {
    const updated = await authService.removeAvatar();
    setUser(updated);
    return updated;
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.perfil === "ADMIN",
    login,
    logout,
    refreshUser,
    updateProfileName,
    updateAvatar,
    removeAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
