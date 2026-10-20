import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="50" fill="#1e293b"/><circle cx="50" cy="38" r="18" fill="#94a3b8"/><path d="M18 88 C18 68 34 62 50 62 C66 62 82 68 82 88 Z" fill="#94a3b8"/></svg>`;

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
    return res.status(200).json({
      success: true,
      user: {
        id: currentUser.id,
        nome: currentUser.nome || "Kelvi Matos",
        email: currentUser.email,
        perfil: currentUser.perfil,
        avatarUrl: "/api/auth/profile/avatar",
      },
    });
  }

  // 3. DELETE /api/auth/profile/avatar (Remove avatar)
  if (req.method === "DELETE" && pathname.includes("/avatar")) {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Não autorizado." });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: currentUser.id,
        nome: currentUser.nome || "Kelvi Matos",
        email: currentUser.email,
        perfil: currentUser.perfil,
        avatarUrl: null,
      },
    });
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
    return res.status(200).json({
      success: true,
      user: {
        id: currentUser.id,
        nome: novoNome,
        email: currentUser.email,
        perfil: currentUser.perfil,
        avatarUrl: null,
      },
    });
  }

  return res.status(200).json({ success: true });
}

