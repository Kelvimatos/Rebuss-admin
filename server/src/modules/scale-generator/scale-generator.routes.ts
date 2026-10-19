import { Router } from "express";
import rateLimit from "express-rate-limit";
import { scaleGeneratorController } from "./scale-generator.controller.js";
import { locateAddressSchema } from "./scale-generator.schemas.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const scaleGeneratorRouter = Router();

// Protect geocoding and external transit APIs from flood attacks
const locateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas buscas de endereço consecutivas. Aguarde 1 minuto e tente novamente.",
  },
});

scaleGeneratorRouter.post(
  "/locate",
  authenticate,
  locateLimiter,
  validateBody(locateAddressSchema),
  scaleGeneratorController.locate
);

scaleGeneratorRouter.get(
  "/locate",
  authenticate,
  locateLimiter,
  scaleGeneratorController.locate
);

export default scaleGeneratorRouter;
