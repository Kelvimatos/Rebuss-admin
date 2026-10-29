import { Request, Response, NextFunction } from "express";
import fs from "fs";
import { authService } from "./auth.service.js";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper function to validate real image magic bytes
function isValidImageBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return true;

  // PNG: 89 50 4E 47
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (isPng) return true;

  // WebP: RIFF .... WEBP
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  if (isRiff && isWebp) return true;

  return false;
}

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;
      const result = await authService.login(req.body, ip);

      // Set secure HttpOnly cookie
      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
      });

      res.status(200).json({
        success: true,
        message: "Autenticação realizada com sucesso.",
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      res.status(200).json({
        success: true,
        message: "Logout realizado com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Não autenticado.",
        });
        return;
      }

      const user = await authService.getMe(req.user.id);
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Não autenticado." });
        return;
      }

      const { nome } = req.body;
      const user = await authService.updateProfile(req.user.id, nome);
      res.status(200).json({
        success: true,
        message: "Nome do perfil atualizado com sucesso.",
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Não autenticado." });
        return;
      }

      let avatarUrl: string;
      if (req.file) {
        // Read initial bytes to check magic numbers
        const buffer = fs.readFileSync(req.file.path);
        if (!isValidImageBytes(buffer)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
          res.status(400).json({
            success: false,
            message: "Formato de arquivo inválido. Apenas imagens JPEG, PNG e WebP reais são permitidas.",
          });
          return;
        }
        avatarUrl = `/uploads/avatars/${req.file.filename}`;
      } else {
        // The client sends a resized data URI so the image can be stored durably in the database.
        const dataUri = req.body?.avatar;
        const match = typeof dataUri === "string"
          ? /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri)
          : null;
        if (!match) {
          res.status(400).json({
            success: false,
            message: "Nenhuma imagem válida foi enviada.",
          });
          return;
        }

        const imageBuffer = Buffer.from(match[1], "base64");
        if (
          imageBuffer.length > 5 * 1024 * 1024 ||
          imageBuffer.toString("base64") !== match[1] ||
          !isValidImageBytes(imageBuffer)
        ) {
          res.status(400).json({
            success: false,
            message: "Imagem inválida ou maior que o limite de 5 MB.",
          });
          return;
        }
        avatarUrl = dataUri;
      }

      const user = await authService.updateAvatar(req.user.id, avatarUrl);

      res.status(200).json({
        success: true,
        message: "Foto de perfil atualizada com sucesso.",
        user,
      });
    } catch (error) {
      // Clean up file if error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      next(error);
    }
  }

  async removeAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Não autenticado." });
        return;
      }

      const user = await authService.removeAvatar(req.user.id);
      res.status(200).json({
        success: true,
        message: "Foto de perfil removida com sucesso.",
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Não autenticado." });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      await authService.updatePassword(req.user.id, currentPassword, newPassword);
      res.status(200).json({
        success: true,
        message: "Senha atualizada com sucesso.",
      });
    } catch (error) {
      next(error);
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      res.status(200).json({
        success: true,
        message: "Se o e-mail estiver cadastrado, as instruções de redefinição foram processadas com segurança.",
        ...(process.env.NODE_ENV !== "production" && result.resetToken
          ? { devResetToken: result.resetToken }
          : {}),
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await authService.confirmPasswordReset(token, newPassword);
      res.status(200).json({
        success: true,
        message: "Senha redefinida com sucesso. Você já pode autenticar com a nova credencial.",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
