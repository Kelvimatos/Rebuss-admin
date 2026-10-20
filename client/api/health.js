export default function handler(req, res) {
  res.status(200).json({ status: "ok", app: "REBUSS OPS API", source: "client/api" });
}
