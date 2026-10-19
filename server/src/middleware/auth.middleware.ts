import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { JWT_SECRET } from "../config/security.env.js";

export interface AuthenticatedUser {
  id: string;
  nome: string;
  email: string;
  perfil: "ADMIN" | "OPERADOR";
  ativo: boolean;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.token || req.cookies?.rebuss_token;

    if (!token && req.headers.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.slice(7).trim();
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Acesso não autorizado. Faça login para continuar.",
      });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: "Sessão inválida ou expirada. Faça login novamente.",
      });
      return;
    }

    if (!decoded || !decoded.id) {
      res.status(401).json({
        success: false,
        message: "Token inválido.",
      });
      return;
    }

    // Verify user in database and ensure active status
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Usuário associado à sessão não foi encontrado.",
      });
      return;
    }

    if (!user.ativo) {
      res.status(403).json({
        success: false,
        message: "Conta desativada pelo administrador. Acesso negado.",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> | void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Não autenticado.",
    });
    return;
  }

  if (req.user.perfil !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Acesso negado. Apenas administradores podem executar esta ação.",
    });
    return;
  }

  next();
};

