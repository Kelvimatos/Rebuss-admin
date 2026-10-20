const fs = require('fs');
const path = require('path');

try {
  const projectRoot = path.resolve(__dirname, '../../../');
  const clientDist = path.resolve(projectRoot, 'client/dist');
  const rootDist = path.resolve(projectRoot, 'dist');
  const rootPublic = path.resolve(projectRoot, 'public');

  // 1. Sincroniza o frontend estático compilado pelo Vite para dist/ e public/
  if (fs.existsSync(clientDist)) {
    if (!fs.existsSync(rootDist)) {
      fs.mkdirSync(rootDist, { recursive: true });
    }
    fs.cpSync(clientDist, rootDist, { recursive: true });

    if (!fs.existsSync(rootPublic)) {
      fs.mkdirSync(rootPublic, { recursive: true });
    }
    fs.cpSync(clientDist, rootPublic, { recursive: true });
    console.log('[Sync Dist] Frontend estático sincronizado com sucesso para ./dist e ./public');
  }

  // 2. Garante paridade total das Serverless Functions entre client/api e root api/
  // Vercel com Root Directory = "client" usa client/api
  // Vercel com Root Directory = "./" usa ./api
  const clientApi = path.resolve(projectRoot, 'client/api');
  const rootApi = path.resolve(projectRoot, 'api');

  if (fs.existsSync(clientApi)) {
    if (!fs.existsSync(rootApi)) {
      fs.mkdirSync(rootApi, { recursive: true });
    }
    fs.cpSync(clientApi, rootApi, { recursive: true });
  } else if (fs.existsSync(rootApi)) {
    if (!fs.existsSync(clientApi)) {
      fs.mkdirSync(clientApi, { recursive: true });
    }
    fs.cpSync(rootApi, clientApi, { recursive: true });
  }
  console.log('[Sync Dist] Serverless Functions sincronizadas e compatíveis com Vercel (client/api e api/)');
} catch (err) {
  console.warn('[Sync Dist] Aviso durante sincronização de diretórios:', err.message);
}
