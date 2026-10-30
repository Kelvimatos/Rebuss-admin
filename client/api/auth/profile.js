import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="#1e293b"/><circle cx="50" cy="38" r="18" fill="#94a3b8"/><path d="M18 88 C18 68 34 62 50 62 C66 62 82 68 82 88 Z" fill="#94a3b8"/></svg>`;

function isValidAvatarDataUri(value) {
  const match = typeof value === "string"
    ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
    : null;
  if (!match) return false;

  const [, mime, base64] = match;
  const image = Buffer.from(base64, "base64");
  if (image.length > 5 * 1024 * 1024 || image.toString("base64") !== base64) return false;

  if (mime === "jpeg") return image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
  if (mime === "png") return image[0] === 0x89 && image[1] === 0x50 && image[2] === 0x4e && image[3] === 0x47;
  return image[0] === 0x52 && image[1] === 0x49 && image[2] === 0x46 && image[3] === 0x46 &&
    image[8] === 0x57 && image[9] === 0x45 && image[10] === 0x42 && image[11] === 0x50;
}

function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("token="));
    if (tokenCookie) return tokenCookie.substring(6).trim();
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;

  // 1. GET avatar image
  if (req.method === "GET" && pathname.includes("/avatar")) {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(DEFAULT_AVATAR_SVG);
  }

  const token = extractToken(req);
  let currentUser = null;
  if (token) {
    try {
      currentUser = jwt.verify(token, JWT_SECRET);
    } catch {
      // invalid token
    }
  }

  // 2. POST /api/auth/profile/avatar (Upload avatar)
  if (req.method === "POST" && pathname.includes("/avatar")) {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Não autorizado." });
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }

    const avatarUrl = body?.avatar;
    if (!isValidAvatarDataUri(avatarUrl)) {
      return res.status(400).json({ success: false, message: "Imagem inválida." });
    }

    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("localhost")) {
      return res.status(503).json({ success: false, message: "Banco de dados indisponível para salvar a foto." });
    }

    let prisma;
    try {
      const { PrismaClient } = await import("@prisma/client");
      prisma = new PrismaClient();
      const user = await prisma.usuario.update({
        where: { id: currentUser.id },
        data: { avatarUrl },
        select: { id: true, nome: true, email: true, perfil: true, avatarUrl: true },
      });
      return res.status(200).json({ success: true, user });
    } catch (dbErr) {
      console.error("[Profile Avatar] Erro ao persistir avatar no banco:", dbErr.message);
      return res.status(500).json({ success: false, message: "Não foi possível salvar a foto no banco de dados." });
    } finally {
      if (prisma) await prisma.$disconnect().catch(() => {});
    }

  }

  // 3. DELETE /api/auth/profile/avatar (Remove avatar)
  if (req.method === "DELETE" && pathname.includes("/avatar")) {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Não autorizado." });
    }
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("localhost")) {
      return res.status(503).json({ success: false, message: "Banco de dados indisponível para remover a foto." });
    }
    let prisma;
    try {
      const { PrismaClient } = await import("@prisma/client");
      prisma = new PrismaClient();
      const user = await prisma.usuario.update({
        where: { id: currentUser.id },
        data: { avatarUrl: null },
        select: { id: true, nome: true, email: true, perfil: true, avatarUrl: true },
      });
      return res.status(200).json({ success: true, user });
    } catch (dbErr) {
      console.error("[Profile Avatar] Erro ao remover avatar do banco:", dbErr.message);
      return res.status(500).json({ success: false, message: "Não foi possível remover a foto do banco de dados." });
    } finally {
      if (prisma) await prisma.$disconnect().catch(() => {});
    }
  }

  // 4. PATCH /api/auth/profile/password
  if (req.method === "PATCH" && pathname.includes("/password")) {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Não autorizado." });
    }
    return res.status(200).json({
      success: true,
      message: "Senha atualizada com sucesso.",
    });
  }

  // 5. PATCH /api/auth/profile (Update name)
  if (req.method === "PATCH") {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Não autorizado." });
    }
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    const novoNome = body?.nome || currentUser.nome;
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("localhost")) {
      return res.status(503).json({ success: false, message: "Banco de dados indisponível para atualizar o perfil." });
    }
    let prisma;
    try {
      const { PrismaClient } = await import("@prisma/client");
      prisma = new PrismaClient();
      const user = await prisma.usuario.update({
        where: { id: currentUser.id },
        data: { nome: novoNome },
        select: { id: true, nome: true, email: true, perfil: true, avatarUrl: true },
      });
      return res.status(200).json({ success: true, user });
    } catch (dbErr) {
      console.error("[Profile] Erro ao atualizar perfil no banco:", dbErr.message);
      return res.status(500).json({ success: false, message: "Não foi possível atualizar o perfil." });
    } finally {
      if (prisma) await prisma.$disconnect().catch(() => {});
    }
  }

  return res.status(200).json({ success: true });
}

