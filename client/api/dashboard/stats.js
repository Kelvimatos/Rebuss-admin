import jwt from "jsonwebtoken";
import { initialData } from "../_data/initial-data.js";

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

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Método não permitido." });
  }

  const user = verifyUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado. Faça login para continuar.",
    });
  }

  const store = loadData();

  const totalEquipes = store.teams.length;
  const totalEquipesAtivas = store.teams.filter((t) => t.ativo !== false).length;
  const totalMembros = store.teams.reduce((acc, t) => acc + (t.membros ? t.membros.length : 0), 0);
  const totalFerramentas = store.tools ? store.tools.length : 2;

  // Distribuição por região
  const regiaoMap = {};
  store.teams.forEach((t) => {
    const r = (t.regiao || "OUTROS").toUpperCase();
    regiaoMap[r] = (regiaoMap[r] || 0) + 1;
  });

  const regiaoStats = Object.keys(regiaoMap).map((r) => ({
    regiao: r,
    totalEquipes: regiaoMap[r],
  }));

  const atividadesRecentes = [
    {
      id: "act-1",
      tipo: "SISTEMA",
      descricao: "Sistema REBUSS OPS inicializado com 24 equipes e 231 integrantes",
      createdAt: new Date().toISOString(),
      usuario: { id: user.id, nome: user.nome || "Administrador", email: user.email, perfil: user.perfil },
    },
  ];

  return res.status(200).json({
    success: true,
    stats: {
      totalEquipes,
      totalEquipesAtivas,
      totalMembros,
      totalFerramentas,
      regiaoStats,
      atividadesRecentes,
    },
  });
}
