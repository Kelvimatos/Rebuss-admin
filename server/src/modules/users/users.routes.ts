import { Router } from "express";
import { usersController } from "./users.controller.js";
import { createUserSchema, updateUserSchema, updateUserStatusSchema } from "./users.schemas.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

const usersRouter = Router();

// All user management routes require valid authentication and ADMIN role
usersRouter.use(authenticate, requireAdmin);

usersRouter.get("/", usersController.list);
usersRouter.get("/:id", usersController.getById);
usersRouter.post("/", validateBody(createUserSchema), usersController.create);
usersRouter.patch("/:id", validateBody(updateUserSchema), usersController.update);
usersRouter.patch("/:id/status", validateBody(updateUserStatusSchema), usersController.updateStatus);

export default usersRouter;

