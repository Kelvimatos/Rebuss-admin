const { execSync } = require("child_process");

try {
  execSync("npx prisma generate", { stdio: "inherit" });
} catch (err) {
  console.warn("[Prisma] Aviso na geração do cliente (utilizando cliente existente):", err.message);
}
