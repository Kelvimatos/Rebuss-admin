import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Unhandled Error:", err);

  // Prisma Unique Constraint Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[]) || [];
      res.status(409).json({
        success: false,
        message: `Já existe um registro com os mesmos valores para o campo: ${target.join(", ")}`,
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Registro não encontrado no banco de dados.",
      });
      return;
    }
  }

  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Ocorreu um erro interno no servidor."
      : err.message || "Erro interno do servidor.";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

