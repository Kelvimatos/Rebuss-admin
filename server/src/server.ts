import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import prisma from "./lib/prisma.js";
import { getAllowedOrigins } from "./config/security.env.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const isProduction = process.env.NODE_ENV === "production";

// Disable fingerprinting
app.disable("x-powered-by");

// Trust proxy if deployed behind reverse proxy (Render, Vercel, Railway, Nginx, Cloudflare)
if (isProduction) {
  app.set("trust proxy", 1);
}

// 1. Security Headers with Helmet
app.use(
  helmet({
    frameguard: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:", "http://127.0.0.1:3001", "http://localhost:3001"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite carregar avatares estáticos no frontend
  })
);

// 2. Strict CORS Configuration
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem header Origin (ex: mobile apps, curl, chamadas internas same-origin)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.trim().replace(/\/$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Em ambiente de desenvolvimento local, permite localhost e 127.0.0.1 em qualquer porta
      if (!isProduction) {
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
          return callback(null, true);
        }
      }

      // Em produção, rejeita qualquer origem não autorizada
      return callback(
        new Error(`Origem [${origin}] não autorizada pelas políticas de segurança CORS do Rebuss Ops.`),
        false
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 3. Global API Rate Limiting (Proteção contra DoS e abuso)
const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 600, // 600 requisições por IP a cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Limite de requisições excedido. Aguarde alguns minutos antes de tentar novamente.",
  },
});
app.use("/api", apiGlobalLimiter);

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// 4. Static Files with path traversal protection
const uploadsPath = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use("/uploads", express.static(uploadsPath, { dotfiles: "deny", maxAge: isProduction ? "7d" : 0 }));

const geradorPath = path.resolve(process.cwd(), "Gerador-de-Escala-Rebuss-main");
if (fs.existsSync(geradorPath)) {
  app.use("/legacy-tools/gerador-de-escala", express.static(geradorPath, { dotfiles: "deny" }));
}

// 5. REST API routes
app.use("/api", apiRouter);

// 6. Production SPA Serving (permite rodar frontend compilado e backend em um único serviço unificado)
if (isProduction) {
  const clientDistPath = path.resolve(process.cwd(), "client", "dist");
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath, { dotfiles: "deny", maxAge: "1d" }));
    app.get("*", (req, res, next) => {
      // Ignora rotas de API e arquivos estáticos especiais
      if (
        req.path.startsWith("/api") ||
        req.path.startsWith("/uploads") ||
        req.path.startsWith("/legacy-tools")
      ) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }
}

// 7. Error handling
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
