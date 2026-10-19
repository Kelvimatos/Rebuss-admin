import bcrypt from "bcryptjs";
import prisma from "../../lib/prisma.js";
import { registrarAtividade } from "../../lib/audit.js";
import { CreateUserInput, UpdateUserInput, UpdateUserStatusInput } from "./users.schemas.js";

export class UsersService {
  async listUsers() {
    return prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            equipesCriadas: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getUserById(id: string) {
    const user = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      const err = new Error("Usuário não encontrado.");
      (err as any).statusCode = 404;
      throw err;
    }

    return user;
  }

  async createUser(input: CreateUserInput, actorId?: string) {
    const email = input.email.toLowerCase().trim();

    const existing = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existing) {
      const err = new Error("Já existe um usuário cadastrado com este e-mail.");
      (err as any).statusCode = 409;
      throw err;
    }

    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(input.senha, saltRounds);

    const newUser = await prisma.usuario.create({
      data: {
        nome: input.nome.trim(),
        email,
        senhaHash,
        perfil: input.perfil,
        ativo: input.ativo,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        createdAt: true,
      },
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "USUARIO_CRIADO",
      descricao: `Novo usuário cadastrado: ${newUser.nome} (${newUser.email}) com perfil ${newUser.perfil}`,
    });

    return newUser;
  }

  async updateUser(id: string, input: UpdateUserInput, actorId?: string) {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      const err = new Error("Usuário não encontrado.");
      (err as any).statusCode = 404;
      throw err;
    }

    const primaryAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || "kelvimatosalves@gmail.com").toLowerCase().trim();
    const isPrimaryAdmin = user.email.toLowerCase() === primaryAdminEmail;

    if (isPrimaryAdmin) {
      if (input.perfil && input.perfil !== "ADMIN") {
        const err = new Error("A conta do administrador principal não pode ter seu perfil alterado.");
        (err as any).statusCode = 403;
        throw err;
      }
      if (input.ativo === false) {
        const err = new Error("A conta do administrador principal não pode ser desativada.");
        (err as any).statusCode = 400;
        throw err;
      }
      if (input.email && input.email.toLowerCase().trim() !== primaryAdminEmail) {
        const err = new Error("O e-mail do administrador principal não pode ser modificado.");
        (err as any).statusCode = 403;
        throw err;
      }
    }

    const dataToUpdate: any = {};

    if (input.nome !== undefined) dataToUpdate.nome = input.nome.trim();
    if (input.perfil !== undefined) dataToUpdate.perfil = input.perfil;
    if (input.ativo !== undefined) dataToUpdate.ativo = input.ativo;

    if (input.email !== undefined) {
      const newEmail = input.email.toLowerCase().trim();
      if (newEmail !== user.email) {
        const existing = await prisma.usuario.findUnique({ where: { email: newEmail } });
        if (existing) {
          const err = new Error("Já existe outro usuário cadastrado com este e-mail.");
          (err as any).statusCode = 409;
          throw err;
        }
        dataToUpdate.email = newEmail;
      }
    }

    if (input.senha) {
      dataToUpdate.senhaHash = await bcrypt.hash(input.senha, 10);
    }

    const updatedUser = await prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        updatedAt: true,
      },
    });

    await registrarAtividade({
      usuarioId: actorId,
      tipo: "USUARIO_EDITADO",
      descricao: `Usuário ${updatedUser.nome} (${updatedUser.email}) foi atualizado`,
    });

    return updatedUser;
  }

  async updateUserStatus(id: string, input: UpdateUserStatusInput, currentUserId?: string) {
    if (id === currentUserId && !input.ativo) {
      const err = new Error("Você não pode desativar seu próprio usuário administrador.");
      (err as any).statusCode = 400;
      throw err;
    }

    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) {
      const err = new Error("Usuário não encontrado.");
      (err as any).statusCode = 404;
      throw err;
    }

    const primaryAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || "kelvimatosalves@gmail.com").toLowerCase().trim();
    if (user.email.toLowerCase() === primaryAdminEmail && !input.ativo) {
      const err = new Error("A conta do administrador principal não pode ser desativada.");
      (err as any).statusCode = 400;
      throw err;
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: { ativo: input.ativo },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        updatedAt: true,
      },
    });

    await registrarAtividade({
      usuarioId: currentUserId,
      tipo: "USUARIO_STATUS_ALTERADO",
      descricao: `Status do usuário ${updated.nome} alterado para ${updated.ativo ? "ATIVO" : "INATIVO"}`,
    });

    return updated;
  }
}

export const usersService = new UsersService();

