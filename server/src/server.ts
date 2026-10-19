import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import prisma from "./lib/prisma.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Configure CORS for cookies and client requests
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (
        origin === FRONTEND_URL ||
        origin === "http://localhost:5173" ||
        origin === "http://127.0.0.1:5173"
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Allow dev origins safely
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded avatars and media statically
const uploadsPath = path.resolve(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsPath));

// Serve Gerador de Escalas legacy files as a static route so it can be previewed/embedded
const geradorPath = path.resolve(process.cwd(), "Gerador-de-Escala-Rebuss-main");
app.use("/legacy-tools/gerador-de-escala", express.static(geradorPath));

// API routes
app.use("/api", apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[REBUSS OPS] Servidor backend ativo na porta ${PORT}`);
  console.log(`[REBUSS OPS] Modo: ${process.env.NODE_ENV || "development"}`);
  console.log(`[REBUSS OPS] API base: http://127.0.0.1:${PORT}/api`);
});

// Prevent unhandled rejections from crashing the backend process unexpectedly
process.on("unhandledRejection", (reason) => {
  console.error("[REBUSS OPS] Unhandled Rejection capturada:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[REBUSS OPS] Uncaught Exception capturada:", err);
});

// Graceful shutdown that immediately closes keep-alive connections so port 3001 is released without delay
let isShuttingDown = false;
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("\n[REBUSS OPS] Encerrando servidor com segurança...");
  server.closeAllConnections?.();
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // Ignore disconnect errors during shutdown
    }
    console.log("[REBUSS OPS] Conexão com o banco finalizada.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
