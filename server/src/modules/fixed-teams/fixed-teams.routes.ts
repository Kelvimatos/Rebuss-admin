import { Router } from "express";
import { fixedTeamsController } from "./fixed-teams.controller.js";
import {
  createTeamSchema,
  updateTeamSchema,
  queryTeamsSchema,
  createMemberSchema,
  updateMemberSchema,
  reorderMembersSchema,
} from "./fixed-teams.schemas.js";
import { validateBody, validateQuery } from "../../middleware/validate.middleware.js";
import { authenticate, requireAdmin } from "../../middleware/auth.middleware.js";

const fixedTeamsRouter = Router();

// All fixed-teams routes require authentication
fixedTeamsRouter.use(authenticate);

// Read endpoints (ADMIN and OPERADOR can view and copy)
fixedTeamsRouter.get("/", validateQuery(queryTeamsSchema), fixedTeamsController.list);
fixedTeamsRouter.get("/:id", fixedTeamsController.getById);

// Team Mutation endpoints (ADMIN only)
fixedTeamsRouter.post("/", requireAdmin, validateBody(createTeamSchema), fixedTeamsController.create);
fixedTeamsRouter.patch("/:id", requireAdmin, validateBody(updateTeamSchema), fixedTeamsController.update);
fixedTeamsRouter.delete("/:id", requireAdmin, fixedTeamsController.delete);

// Member Mutation endpoints (ADMIN only)
fixedTeamsRouter.post("/:id/members", requireAdmin, validateBody(createMemberSchema), fixedTeamsController.addMember);
fixedTeamsRouter.patch(
  "/:id/members/order",
  requireAdmin,
  validateBody(reorderMembersSchema),
  fixedTeamsController.reorderMembers
);
fixedTeamsRouter.patch(
  "/:id/members/:memberId",
  requireAdmin,
  validateBody(updateMemberSchema),
  fixedTeamsController.updateMember
);
fixedTeamsRouter.delete(
  "/:id/members/:memberId",
  requireAdmin,
  fixedTeamsController.deleteMember
);

export default fixedTeamsRouter;

