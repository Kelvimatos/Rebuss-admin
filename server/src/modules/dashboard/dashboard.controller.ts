import { Request, Response, NextFunction } from "express";
import { dashboardService } from "./dashboard.service.js";

export class DashboardController {
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await dashboardService.getStats();
      res.status(200).json({ success: true, stats });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();

