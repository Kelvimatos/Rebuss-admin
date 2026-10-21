import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "rebuss_ops_secret_key_jwt_auth_session_token_2026_secure";

const REGISTERED_USERS = [
  {
    id: "7a515ada-1bca-48cb-a2ad-3112108444cf",
    nome: "Kelvi Matos",
    email: "kelvimatosalves@gmail.com",
    perfil: "ADMIN",
    ativo: true,
  },
  {
    id: "d626134f-1105-4d97-bc27-bc189dbe9297",
    nome: "Bruno",
    email: "bruno@rebuss.com",
    perfil: "OPERADOR",
    ativo: true,
  },
  {
    id: "7065ce37-45ae-4973-9004-be952a74b0f7",
    nome: "Francisco",
    email: "francisco@rebuss.com",
    perfil: "OPERADOR",
    ativo: true,
  },
  {
    id: "fe578215-6d45-444a-86f9-0897a44d8e33",
    nome: "Arthur",
    email: "arthur@rebuss.com",
    perfil: "OPERADOR",
    ativo: true,
  },
  {
    id: "7240ade1-817a-456b-85fb-c1bf6b43d8f5",
    nome: "Matheus",
    email: "matheus@rebuss.com",
    perfil: "OPERADOR",
    ativo: true,
  },
];

function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // Tenta extrair do cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith("token="));
    if (tokenCookie) {
      return tokenCookie.substring(6).trim();
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} não permitido. Utilize GET.`,
    });
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado. Faça login para continuar.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = null;
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")) {
      try {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient();
        user = await prisma.usuario.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            nome: true,
            email: true,
            perfil: true,
            ativo: true,
            avatarUrl: true,
          },
        });
        await prisma.$disconnect();
      } catch (dbErr) {
        console.warn("[Auth Vercel /me] Conexão com banco falhou, usando fallback seguro:", dbErr.message);
      }
    }

    if (!user) {
      user = REGISTERED_USERS.find((u) => u.id === decoded.id || u.email.toLowerCase() === decoded.email?.toLowerCase());
    }

    if (!user || !user.ativo) {
      return res.status(401).json({
        success: false,
        message: "Usuário não encontrado ou inativo.",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        ativo: user.ativo,
        avatarUrl: user.avatarUrl || null,
      },
    });
  } catch (_err) {
    return res.status(401).json({
      success: false,
      message: "Sessão expirada ou token inválido. Faça login novamente.",
    });
  }
}
