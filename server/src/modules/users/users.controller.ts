import { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service.js";

export class UsersController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await usersService.listUsers();
      res.status(200).json({ success: true, users });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await usersService.getUserById(id);
      res.status(200).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.createUser(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso.",
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await usersService.updateUser(id, req.body, req.user?.id);
      res.status(200).json({
        success: true,
        message: "Usuário atualizado com sucesso.",
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const user = await usersService.updateUserStatus(id, req.body, req.user?.id);
      res.status(200).json({
        success: true,
        message: `Usuário ${user.ativo ? "ativado" : "desativado"} com sucesso.`,
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();

