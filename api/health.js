export default function handler(req, res) {
  const hasDb = Boolean(process.env.DATABASE_URL);
  let dbTarget = "não configurado";
  if (hasDb) {
    const raw = process.env.DATABASE_URL;
    if (raw.includes("@")) {
      dbTarget = raw.split("@")[1].split("/")[0];
    } else {
      dbTarget = "configurado (formato opaco)";
    }
  }

  res.status(200).json({
    status: "ok",
    app: "REBUSS OPS API",
    version: "2.5.0-routine-assistant",
    source: "client/api",
    timestamp: new Date().toISOString(),
    database: {
      configured: hasDb,
      target: dbTarget,
    },
    jwtConfigured: Boolean(process.env.JWT_SECRET),
  });
}
