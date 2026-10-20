import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { initialData } from "./_data/initial-data.js";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

let cachedData = null;

function loadData() {
  if (!cachedData) {
    cachedData = JSON.parse(JSON.stringify(initialData));
  }
  return cachedData;
}

function verifyUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("token="));
    if (tokenCookie) {
      token = tokenCookie.substring(6).trim();
    }
  }

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const currentUser = verifyUser(req);
  if (!currentUser) {
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado. Faça login para continuar.",
    });
  }

  // Apenas ADMIN tem acesso à gestão de usuários
  if (currentUser.perfil !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Acesso restrito ao administrador do sistema.",
    });
  }

  const store = loadData();
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;
  const parts = pathname.split("/").filter(Boolean);
  const userId = parts[2] && parts[2] !== "users" ? parts[2] : null;
  const isStatus = parts[3] === "status";

  // 1. LIST USERS: GET /api/users
  if (req.method === "GET" && !userId) {
    return res.status(200).json({
      success: true,
      users: store.users || [],
    });
  }

  // 2. CREATE USER: POST /api/users
  if (req.method === "POST" && !userId) {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { nome, email, senha, perfil, ativo } = body || {};

    if (!nome || !email || !senha) {
      return res.status(400).json({ success: false, message: "Campos obrigatórios ausentes." });
    }

    const emailNorm = email.toLowerCase().trim();
    if (store.users.some((u) => u.email.toLowerCase() === emailNorm)) {
      return res.status(400).json({ success: false, message: "E-mail já cadastrado no sistema." });
    }

    const newUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome,
      email: emailNorm,
      perfil: perfil === "ADMIN" ? "ADMIN" : "OPERADOR",
      ativo: ativo !== false,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    return res.status(201).json({ success: true, user: newUser });
  }

  // 3. UPDATE USER: PATCH /api/users/:id
  if (req.method === "PATCH" && userId && !isStatus) {
    const userToEdit = store.users.find((u) => u.id === userId);
    if (!userToEdit) {
      return res.status(404).json({ success: false, message: "Usuário não encontrado." });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (body.nome) userToEdit.nome = body.nome;
    if (body.email) userToEdit.email = body.email.toLowerCase().trim();
    if (body.perfil) userToEdit.perfil = body.perfil;
    if (body.ativo !== undefined) userToEdit.ativo = body.ativo;

    return res.status(200).json({ success: true, user: userToEdit });
  }

  // 4. UPDATE USER STATUS: PATCH /api/users/:id/status
  if (req.method === "PATCH" && userId && isStatus) {
    const userToEdit = store.users.find((u) => u.id === userId);
    if (!userToEdit) {
      return res.status(404).json({ success: false, message: "Usuário não encontrado." });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    userToEdit.ativo = Boolean(body.ativo);

    return res.status(200).json({ success: true, user: userToEdit });
  }

  return res.status(404).json({ success: false, message: `Rota ${req.method} ${pathname} não encontrada.` });
}
