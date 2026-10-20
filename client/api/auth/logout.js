export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Clear session cookie
  res.setHeader(
    "Set-Cookie",
    "token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );

  return res.status(200).json({
    success: true,
    message: "Logout realizado com sucesso.",
  });
}

