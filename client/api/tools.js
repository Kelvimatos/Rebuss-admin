import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

let cachedData = null;

function loadData() {
  if (cachedData) return cachedData;
  try {
    const dataPath = path.resolve(process.cwd(), "api/data/initial-data.json");
    if (fs.existsSync(dataPath)) {
      cachedData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
      return cachedData;
    }
  } catch {}

  try {
    const clientPath = path.resolve(process.cwd(), "client/api/data/initial-data.json");
    if (fs.existsSync(clientPath)) {
      cachedData = JSON.parse(fs.readFileSync(clientPath, "utf8"));
      return cachedData;
    }
  } catch {}

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

  return res.status(200).json({
    success: true,
    tools: store.tools || [],
  });
}
