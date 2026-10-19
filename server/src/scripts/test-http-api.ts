import crypto from "crypto";
import prisma from "../lib/prisma.js";

const ADMIN_EMAIL = "kelvimatosalves@gmail.com";

async function main() {
  console.log("Testing HTTP Endpoints...");

  const adminUserBefore = await prisma.usuario.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (!adminUserBefore) {
    throw new Error(`Conta administrativa ${ADMIN_EMAIL} não encontrada.`);
  }
  const originalSenhaHash = adminUserBefore.senhaHash;

  try {
    // 1. Health check
    const healthRes = await fetch("http://localhost:3001/api/health");
    const health = await healthRes.json();
    console.log("1. Health check:", health);

    // 2. Request & Confirm Password Reset with ephemeral runtime credential
    const ephemeralPassword = `Http_${crypto.randomBytes(12).toString("hex")}!`;
    const resetReq = await fetch("http://localhost:3001/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });
    const resetReqData = (await resetReq.json()) as any;

    const resetConfirm = await fetch("http://localhost:3001/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetReqData.resetToken,
        newPassword: ephemeralPassword,
      }),
    });
    console.log("2. Password reset confirm status:", resetConfirm.status);

    // 3. Login with kelvimatosalves@gmail.com
    const loginRes = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ephemeralPassword }),
    });
    const setCookie = loginRes.headers.get("set-cookie") || "";
    const tokenCookie = setCookie.split(";")[0];
    const loginData = (await loginRes.json()) as any;
    console.log(
      "3. Login status:",
      loginRes.status,
      "User:",
      loginData.user?.email,
      "Cookie acquired:",
      !!tokenCookie
    );

    // 4. Get Me
    const meRes = await fetch("http://localhost:3001/api/auth/me", {
      headers: { Cookie: tokenCookie },
    });
    const meData = (await meRes.json()) as any;
    console.log("4. Auth /me status:", meRes.status, "User email:", meData.user?.email);

    // 5. Update Profile Name (PATCH /api/auth/profile)
    const updateRes = await fetch("http://localhost:3001/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie,
      },
      body: JSON.stringify({ nome: "Administrador REBUSS Teste" }),
    });
    const updateData = (await updateRes.json()) as any;
    console.log("5. Profile update status:", updateRes.status, "New name:", updateData.user?.nome);

    // 6. Authenticated Password Update (PATCH /api/auth/profile/password)
    const rotatedPassword = `Rot_${crypto.randomBytes(12).toString("hex")}!`;
    const pwdUpdateRes = await fetch("http://localhost:3001/api/auth/profile/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie,
      },
      body: JSON.stringify({
        currentPassword: ephemeralPassword,
        newPassword: rotatedPassword,
      }),
    });
    console.log("6. Authenticated password update status:", pwdUpdateRes.status);

    // 7. Upload Avatar using native FormData + Blob (POST /api/auth/profile/avatar)
    const png1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const blob = new Blob([png1x1], { type: "image/png" });
    const form = new FormData();
    form.append("avatar", blob, "avatar-test.png");

    const uploadRes = await fetch("http://localhost:3001/api/auth/profile/avatar", {
      method: "POST",
      headers: {
        Cookie: tokenCookie,
      },
      body: form,
    });
    const uploadData = (await uploadRes.json()) as any;
    console.log(
      "7. Avatar upload status:",
      uploadRes.status,
      "Avatar URL:",
      uploadData.user?.avatarUrl
    );

    // 8. Access avatar via static URL
    if (uploadData.user?.avatarUrl) {
      const avatarRes = await fetch(`http://localhost:3001${uploadData.user.avatarUrl}`);
      console.log(
        "8. Static avatar download status:",
        avatarRes.status,
        "Content-Type:",
        avatarRes.headers.get("content-type")
      );
    }

    // 9. Remove Avatar (DELETE /api/auth/profile/avatar)
    const deleteRes = await fetch("http://localhost:3001/api/auth/profile/avatar", {
      method: "DELETE",
      headers: { Cookie: tokenCookie },
    });
    const deleteData = (await deleteRes.json()) as any;
    console.log(
      "9. Avatar delete status:",
      deleteRes.status,
      "Avatar URL after delete:",
      deleteData.user?.avatarUrl
    );

    // 10. Restore original name
    await fetch("http://localhost:3001/api/auth/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: tokenCookie,
      },
      body: JSON.stringify({ nome: "Administrador REBUSS" }),
    });

    // 11. Fetch SP, RJ, and SJC Teams over HTTP
    const [spRes, rjRes, sjcRes] = await Promise.all([
      fetch("http://localhost:3001/api/fixed-teams?regiao=SP", {
        headers: { Cookie: tokenCookie },
      }),
      fetch("http://localhost:3001/api/fixed-teams?regiao=RJ", {
        headers: { Cookie: tokenCookie },
      }),
      fetch("http://localhost:3001/api/fixed-teams?regiao=SJC", {
        headers: { Cookie: tokenCookie },
      }),
    ]);
    const [spData, rjData, sjcData] = (await Promise.all([
      spRes.json(),
      rjRes.json(),
      sjcRes.json(),
    ])) as any[];

    console.log(
      `10. Fixed Teams fetched over HTTP -> SP: ${spData.teams?.length}, RJ: ${rjData.teams?.length}, SJC: ${sjcData.teams?.length}`
    );

    if (
      spData.teams?.length !== 19 ||
      rjData.teams?.length !== 4 ||
      sjcData.teams?.length !== 1
    ) {
      throw new Error("Divergência nas quantidades de equipes retornadas via API HTTP.");
    }

    console.log("\n✅ TODOS OS TESTES HTTP FORAM EXECUTADOS COM SUCESSO!");
  } finally {
    await prisma.usuario.update({
      where: { id: adminUserBefore.id },
      data: { senhaHash: originalSenhaHash },
    });
  }
}

main().catch((err) => {
  console.error("HTTP Test Error:", err);
  process.exit(1);
});
