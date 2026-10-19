import { Router } from "express";
import { dashboardController } from "./dashboard.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get("/stats", dashboardController.getStats);

export default dashboardRouter;

