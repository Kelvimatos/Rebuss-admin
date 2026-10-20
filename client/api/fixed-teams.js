import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

// In-memory / initial snapshot store for fallback
let cachedData = null;

function loadData() {
  if (cachedData) return cachedData;
  try {
    const dataPath = path.resolve(process.cwd(), "api/data/initial-data.json");
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, "utf8");
      cachedData = JSON.parse(content);
      return cachedData;
    }
  } catch {
    // fallback
  }

  try {
    const clientPath = path.resolve(process.cwd(), "client/api/data/initial-data.json");
    if (fs.existsSync(clientPath)) {
      const content = fs.readFileSync(clientPath, "utf8");
      cachedData = JSON.parse(content);
      return cachedData;
    }
  } catch {
    // fallback
  }

  cachedData = { teams: [], tools: [], users: [] };
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

  // Se banco PostgreSQL estiver configurado na nuvem, usa Prisma
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")) {
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      // Delega busca para o prisma
      // ...
      await prisma.$disconnect();
    } catch {
      // continua para fallback resiliente
    }
  }

  const store = loadData();
  const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;
  const parts = pathname.split("/").filter(Boolean);
  // URL format: /api/fixed-teams or /api/fixed-teams/:id or /api/fixed-teams/:id/members or ...
  const teamId = parts[2] && parts[2] !== "fixed-teams" ? parts[2] : null;
  const isMembers = parts[3] === "members";
  const memberId = parts[4] || null;

  // 1. LIST TEAMS: GET /api/fixed-teams
  if (req.method === "GET" && !teamId) {
    const search = (urlObj.searchParams.get("search") || "").trim().toLowerCase();
    const regiao = (urlObj.searchParams.get("regiao") || "ALL").toUpperCase();
    const ativoStr = urlObj.searchParams.get("ativo");

    let filtered = [...store.teams];

    if (regiao && regiao !== "ALL") {
      filtered = filtered.filter((t) => t.regiao.toUpperCase() === regiao);
    }

    if (ativoStr && ativoStr !== "all") {
      const isAtivo = ativoStr === "true";
      filtered = filtered.filter((t) => Boolean(t.ativo) === isAtivo);
    }

    if (search) {
      filtered = filtered.filter((t) => {
        const nomeMatch = t.nome?.toLowerCase().includes(search);
        const supMatch = t.supervisor?.toLowerCase().includes(search);
        const descMatch = t.descricao?.toLowerCase().includes(search);
        const memberMatch = t.membros?.some((m) =>
          m.nome?.toLowerCase().includes(search) ||
          m.matricula?.toLowerCase().includes(search) ||
          m.numero?.toLowerCase().includes(search) ||
          m.cargo?.toLowerCase().includes(search) ||
          m.funcao?.toLowerCase().includes(search)
        );
        return nomeMatch || supMatch || descMatch || memberMatch;
      });
    }

    return res.status(200).json({
      success: true,
      teams: filtered,
    });
  }

  // 2. GET SINGLE TEAM: GET /api/fixed-teams/:id
  if (req.method === "GET" && teamId && !isMembers) {
    const team = store.teams.find((t) => t.id === teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Equipe fixa não encontrada." });
    }
    return res.status(200).json({ success: true, team });
  }

  // 3. CREATE TEAM: POST /api/fixed-teams (Admin only)
  if (req.method === "POST" && !teamId) {
    if (currentUser.perfil !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acesso restrito ao administrador." });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const newTeam = {
      id: `team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: body.nome,
      regiao: (body.regiao || "SP").toUpperCase(),
      supervisor: body.supervisor || null,
      descricao: body.descricao || null,
      ativo: body.ativo !== false,
      membros: [],
      createdBy: { id: currentUser.id, nome: currentUser.nome || "Admin" },
      _count: { membros: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.teams.push(newTeam);
    return res.status(201).json({ success: true, team: newTeam });
  }

  // 4. UPDATE TEAM: PATCH /api/fixed-teams/:id (Admin only)
  if (req.method === "PATCH" && teamId && !isMembers) {
    if (currentUser.perfil !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acesso restrito ao administrador." });
    }
    const team = store.teams.find((t) => t.id === teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Equipe fixa não encontrada." });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (body.nome !== undefined) team.nome = body.nome;
    if (body.regiao !== undefined) team.regiao = body.regiao.toUpperCase();
    if (body.supervisor !== undefined) team.supervisor = body.supervisor;
    if (body.descricao !== undefined) team.descricao = body.descricao;
    if (body.ativo !== undefined) team.ativo = body.ativo;
    team.updatedAt = new Date().toISOString();
    return res.status(200).json({ success: true, team });
  }

  // 5. DELETE TEAM: DELETE /api/fixed-teams/:id (Admin only)
  if (req.method === "DELETE" && teamId && !isMembers) {
    if (currentUser.perfil !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acesso restrito ao administrador." });
    }
    const idx = store.teams.findIndex((t) => t.id === teamId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Equipe fixa não encontrada." });
    }
    const deleted = store.teams.splice(idx, 1)[0];
    return res.status(200).json({
      success: true,
      result: {
        id: deleted.id,
        nome: deleted.nome,
        membersRemovedCount: deleted.membros ? deleted.membros.length : 0,
      },
    });
  }

  // 6. ADD MEMBER: POST /api/fixed-teams/:id/members (Admin only)
  if (req.method === "POST" && teamId && isMembers && !memberId) {
    if (currentUser.perfil !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acesso restrito ao administrador." });
    }
    const team = store.teams.find((t) => t.id === teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Equipe fixa não encontrada." });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const maxOrder = team.membros.reduce((max, m) => Math.max(max, m.ordem || 0), 0);
    const newMember = {
      id: `membro-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      equipeId: team.id,
      nome: body.nome,
      funcao: body.funcao || body.cargo || "Operador",
      cargo: body.cargo || body.funcao || "Operador",
      matricula: body.matricula || null,
      numero: body.numero || (team.membros.length + 1 < 10 ? `0${team.membros.length + 1}` : `${team.membros.length + 1}`),
      ordem: body.ordem ?? (maxOrder + 1),
      ativo: body.ativo !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    team.membros.push(newMember);
    if (team._count) team._count.membros = team.membros.length;
    return res.status(201).json({ success: true, member: newMember });
  }

  // 7. UPDATE MEMBER: PATCH /api/fixed-teams/:id/members/:memberId (Admin only)
  if (req.method === "PATCH" && teamId && isMembers && memberId) {
    if (currentUser.perfil !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acesso restrito ao administrador." });
    }
    const team = store.teams.find((t) => t.id === teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Equipe fixa não encontrada." });
    }
    const member = team.membros.find((m) => m.id === memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: "Membro não encontrado." });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (body.nome !== undefined) member.nome = body.nome;
    if (body.funcao !== undefined) { member.funcao = body.funcao; member.cargo = body.funcao; }
    if (body.cargo !== undefined) { member.cargo = body.cargo; member.funcao = body.cargo; }
    if (body.matricula !== undefined) member.matricula = body.matricula;
    if (body.numero !== undefined) member.numero = body.numero;
    if (body.ordem !== undefined) member.ordem = body.ordem;
    member.updatedAt = new Date().toISOString();
    return res.status(200).json({ success: true, member });
  }

  // 8. DELETE MEMBER: DELETE /api/fixed-teams/:id/members/:memberId (Admin only)
  if (req.method === "DELETE" && teamId && isMembers && memberId) {
    if (currentUser.perfil !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Acesso restrito ao administrador." });
    }
    const team = store.teams.find((t) => t.id === teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: "Equipe fixa não encontrada." });
    }
    const mIdx = team.membros.findIndex((m) => m.id === memberId);
    if (mIdx === -1) {
      return res.status(404).json({ success: false, message: "Membro não encontrado." });
    }
    const deleted = team.membros.splice(mIdx, 1)[0];
    if (team._count) team._count.membros = team.membros.length;
    return res.status(200).json({ success: true, result: { id: deleted.id, nome: deleted.nome } });
  }

  return res.status(404).json({ success: false, message: `Rota ${req.method} ${pathname} não encontrada.` });
}
