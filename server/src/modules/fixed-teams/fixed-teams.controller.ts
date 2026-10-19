import { Request, Response, NextFunction } from "express";
import { fixedTeamsService } from "./fixed-teams.service.js";

export class FixedTeamsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teams = await fixedTeamsService.listTeams(req.query as any);
      res.status(200).json({ success: true, teams });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const team = await fixedTeamsService.getTeamById(id);
      res.status(200).json({ success: true, team });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const team = await fixedTeamsService.createTeam(req.body, req.user?.id);
      res.status(201).json({
        success: true,
        message: "Equipe criada com sucesso.",
        team,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const team = await fixedTeamsService.updateTeam(id, req.body, req.user?.id);
      res.status(200).json({
        success: true,
        message: "Equipe atualizada com sucesso.",
        team,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await fixedTeamsService.deleteTeam(id, req.user?.id);
      res.status(200).json({
        success: true,
        message: `Equipe "${result.nome}" e seus ${result.membersRemovedCount} membros foram excluídos com sucesso.`,
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Member handlers
  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const member = await fixedTeamsService.addMember(id, req.body, req.user?.id);
      res.status(201).json({
        success: true,
        message: "Membro adicionado com sucesso.",
        member,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const memberId = req.params.memberId as string;
      const member = await fixedTeamsService.updateMember(id, memberId, req.body, req.user?.id);
      res.status(200).json({
        success: true,
        message: "Membro atualizado com sucesso.",
        member,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const memberId = req.params.memberId as string;
      const result = await fixedTeamsService.deleteMember(id, memberId, req.user?.id);
      res.status(200).json({
        success: true,
        message: `Membro "${result.nome}" removido com sucesso.`,
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async reorderMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const members = await fixedTeamsService.reorderMembers(id, req.body, req.user?.id);
      res.status(200).json({
        success: true,
        message: "Ordem dos membros atualizada com sucesso.",
        members,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const fixedTeamsController = new FixedTeamsController();

