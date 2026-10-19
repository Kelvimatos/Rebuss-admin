import { Router } from "express";
import { toolsController } from "./tools.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const toolsRouter = Router();

toolsRouter.use(authenticate);
toolsRouter.get("/", toolsController.listActive);
toolsRouter.get("/all", toolsController.list);

export default toolsRouter;

