import { Request, Response, NextFunction } from "express";
import { toolsService } from "./tools.service.js";

export class ToolsController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tools = await toolsService.listTools();
      res.status(200).json({ success: true, tools });
    } catch (error) {
      next(error);
    }
  }

  async listActive(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tools = await toolsService.getActiveTools();
      res.status(200).json({ success: true, tools });
    } catch (error) {
      next(error);
    }
  }
}

export const toolsController = new ToolsController();

