import { Router } from "express";
import { scaleGeneratorController } from "./scale-generator.controller.js";
import { locateAddressSchema } from "./scale-generator.schemas.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const scaleGeneratorRouter = Router();

scaleGeneratorRouter.post(
  "/locate",
  authenticate,
  validateBody(locateAddressSchema),
  scaleGeneratorController.locate
);

scaleGeneratorRouter.get(
  "/locate",
  authenticate,
  scaleGeneratorController.locate
);

export default scaleGeneratorRouter;
