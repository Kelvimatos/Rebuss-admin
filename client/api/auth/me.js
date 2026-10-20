export default function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Acesso não autorizado. Faça login para continuar."
    });
  }
  return res.status(200).json({
    success: true,
    message: "Usuário autenticado"
  });
}

