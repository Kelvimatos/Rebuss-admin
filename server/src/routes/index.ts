import { Router } from "express";
import authRouter from "../modules/auth/auth.routes.js";
import usersRouter from "../modules/users/users.routes.js";
import fixedTeamsRouter from "../modules/fixed-teams/fixed-teams.routes.js";
import toolsRouter from "../modules/tools/tools.routes.js";
import dashboardRouter from "../modules/dashboard/dashboard.routes.js";
import scaleGeneratorRouter from "../modules/scale-generator/scale-generator.routes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/fixed-teams", fixedTeamsRouter);
apiRouter.use("/tools", toolsRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/scale-generator", scaleGeneratorRouter);

// Health check endpoint
apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    app: "REBUSS OPS API",
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;

