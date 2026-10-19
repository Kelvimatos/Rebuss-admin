import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import prisma from "../../lib/prisma.js";
import { registrarAtividade } from "../../lib/audit.js";
import { LoginInput } from "./auth.schemas.js";

const JWT_SECRET = process.env.JWT_SECRET || "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";
const JWT_EXPIRES_IN = "7d";

export class AuthService {
  async login(input: LoginInput, ipAddress?: string) {
    const emailNormalizado = input.email.toLowerCase().trim();

    // Generic error to avoid exposing whether user exists
    const invalidCredentialsError = new Error("Credenciais inválidas. Verifique seu e-mail e senha.");
    (invalidCredentialsError as any).statusCode = 401;

    const user = await prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    });

    if (!user) {
      throw invalidCredentialsError;
    }

    const isMatch = await bcrypt.compare(input.password, user.senhaHash);
    if (!isMatch) {
      throw invalidCredentialsError;
    }

    if (!user.ativo) {
      const inactiveError = new Error("Sua conta está desativada. Entre em contato com o administrador.");
      (inactiveError as any).statusCode = 403;
      throw inactiveError;
    }

    const payload = {
      id: user.id,
      email: user.email,
      perfil: user.perfil,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    await registrarAtividade({
      usuarioId: user.id,
      tipo: "LOGIN",
      descricao: `Usuário ${user.nome} realizou login no sistema`,
      detalhes: ipAddress ? `IP: ${ipAddress}` : undefined,
    });

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        avatarUrl: user.avatarUrl,
        ativo: user.ativo,
      },
    };
  }

  async getMe(userId: string) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        avatarUrl: true,
        ativo: true,
        createdAt: true,
      },
    });

    if (!user || !user.ativo) {
      const err = new Error("Usuário não encontrado ou inativo.");
      (err as any).statusCode = 401;
      throw err;
    }

    return user;
  }

  async updateProfile(userId: string, nome: string) {
    const trimmedNome = nome.trim();
    if (!trimmedNome || trimmedNome.length < 2) {
      const err = new Error("O nome deve ter no mínimo 2 caracteres.");
      (err as any).statusCode = 400;
      throw err;
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { nome: trimmedNome },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        avatarUrl: true,
        ativo: true,
      },
    });

    await registrarAtividade({
      usuarioId: userId,
      tipo: "PERFIL_ATUALIZADO",
      descricao: `Usuário alterou seu nome para: ${updated.nome}`,
    });

    return updated;
  }

  async updateAvatar(userId: string, newAvatarUrl: string) {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error("Usuário não encontrado.");
      (err as any).statusCode = 404;
      throw err;
    }

    // Safely remove previous avatar file if exists
    if (user.avatarUrl && user.avatarUrl.startsWith("/uploads/avatars/")) {
      try {
        const oldPath = path.resolve(process.cwd(), user.avatarUrl.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.error("Erro ao remover avatar anterior:", e);
      }
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { avatarUrl: newAvatarUrl },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        avatarUrl: true,
        ativo: true,
      },
    });

    await registrarAtividade({
      usuarioId: userId,
      tipo: "AVATAR_ATUALIZADO",
      descricao: `Usuário ${updated.nome} alterou sua foto de perfil`,
    });

    return updated;
  }

  async removeAvatar(userId: string) {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error("Usuário não encontrado.");
      (err as any).statusCode = 404;
      throw err;
    }

    if (user.avatarUrl && user.avatarUrl.startsWith("/uploads/avatars/")) {
      try {
        const oldPath = path.resolve(process.cwd(), user.avatarUrl.replace(/^\//, ""));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.error("Erro ao excluir arquivo de avatar:", e);
      }
    }

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        avatarUrl: true,
        ativo: true,
      },
    });

    await registrarAtividade({
      usuarioId: userId,
      tipo: "AVATAR_REMOVIDO",
      descricao: `Usuário ${updated.nome} removeu sua foto de perfil`,
    });

    return updated;
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user || !user.ativo) {
      const err = new Error("Usuário não encontrado ou inativo.");
      (err as any).statusCode = 404;
      throw err;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.senhaHash);
    if (!isMatch) {
      const err = new Error("A senha atual informada está incorreta.");
      (err as any).statusCode = 401;
      throw err;
    }

    const saltRounds = 12;
    const novaSenhaHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.usuario.update({
      where: { id: userId },
      data: { senhaHash: novaSenhaHash },
    });

    await registrarAtividade({
      usuarioId: userId,
      tipo: "SENHA_ATUALIZADA",
      descricao: `Usuário ${user.email} atualizou sua senha de acesso com sucesso`,
    });

    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const emailNormalizado = email.toLowerCase().trim();
    const user = await prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    });

    if (!user || !user.ativo) {
      return {
        success: true,
        resetToken: null,
      };
    }

    const resetSecret = `${JWT_SECRET}:${user.senhaHash}`;
    const resetToken = jwt.sign(
      {
        purpose: "PASSWORD_RESET",
        userId: user.id,
        email: user.email,
      },
      resetSecret,
      { expiresIn: "15m" }
    );

    await registrarAtividade({
      usuarioId: user.id,
      tipo: "SOLICITACAO_REDEFINICAO_SENHA",
      descricao: `Solicitação de redefinição de senha iniciada para ${user.email}`,
    });

    return {
      success: true,
      resetToken,
    };
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    const invalidTokenError = new Error("Token de redefinição inválido ou expirado.");
    (invalidTokenError as any).statusCode = 400;

    const decoded = jwt.decode(token) as { purpose?: string; userId?: string; email?: string } | null;
    if (!decoded || decoded.purpose !== "PASSWORD_RESET" || !decoded.userId) {
      throw invalidTokenError;
    }

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.ativo) {
      throw invalidTokenError;
    }

    const resetSecret = `${JWT_SECRET}:${user.senhaHash}`;
    try {
      jwt.verify(token, resetSecret);
    } catch {
      throw invalidTokenError;
    }

    const saltRounds = 12;
    const novaSenhaHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.usuario.update({
      where: { id: user.id },
      data: { senhaHash: novaSenhaHash },
    });

    await registrarAtividade({
      usuarioId: user.id,
      tipo: "SENHA_REDEFINIDA",
      descricao: `Credencial de acesso redefinida com sucesso para ${user.email}`,
    });

    return {
      success: true,
      email: user.email,
    };
  }
}

export const authService = new AuthService();
