import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authController } from "./auth.controller.js";
import {
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
} from "./auth.schemas.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const authRouter = Router();

// Configure storage for user profile avatars
const uploadDir = path.resolve(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || "anon";
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato de arquivo inválido. Permitido apenas JPEG, PNG e WebP."));
    }
  },
});

// Protect against brute force attacks on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas tentativas de login consecutivas. Aguarde 15 minutos e tente novamente.",
  },
});

authRouter.post("/login", loginLimiter, validateBody(loginSchema), authController.login);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", authenticate, authController.getMe);

// Password reset routes
authRouter.post(
  "/password-reset/request",
  loginLimiter,
  validateBody(requestPasswordResetSchema),
  authController.requestPasswordReset
);
authRouter.post(
  "/password-reset/confirm",
  loginLimiter,
  validateBody(confirmPasswordResetSchema),
  authController.confirmPasswordReset
);

// Profile management routes (Each authenticated user can edit only their own profile)
authRouter.patch(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  authController.updateProfile
);
authRouter.patch(
  "/profile/password",
  authenticate,
  validateBody(updatePasswordSchema),
  authController.updatePassword
);
authRouter.post(
  "/profile/avatar",
  authenticate,
  upload.single("avatar"),
  authController.uploadAvatar
);
authRouter.delete(
  "/profile/avatar",
  authenticate,
  authController.removeAvatar
);

export default authRouter;
