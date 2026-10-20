const fs = require('fs');
const path = require('path');

try {
  const projectRoot = path.resolve(__dirname, '../../../');
  const src = path.resolve(projectRoot, 'client/dist');
  const distDest = path.resolve(projectRoot, 'dist');
  const publicDest = path.resolve(projectRoot, 'public');

  // 1. Sincroniza o frontend estático do Vite para dist/ e public/
  if (fs.existsSync(src)) {
    if (!fs.existsSync(distDest)) {
      fs.mkdirSync(distDest, { recursive: true });
    }
    fs.cpSync(src, distDest, { recursive: true });

    if (!fs.existsSync(publicDest)) {
      fs.mkdirSync(publicDest, { recursive: true });
    }
    fs.cpSync(src, publicDest, { recursive: true });
    console.log('[Sync Dist] Frontend estático sincronizado com sucesso para ./dist e ./public');
  } else {
    console.warn('[Sync Dist] Aviso: client/dist ainda não existe para sincronização.');
  }

  // 2. Sincroniza as funções serverless para dist/api (caso Vercel procure dentro de dist)
  const apiSrc = path.resolve(projectRoot, 'api');
  const apiDest = path.resolve(projectRoot, 'dist/api');
  if (fs.existsSync(apiSrc)) {
    fs.mkdirSync(apiDest, { recursive: true });
    fs.cpSync(apiSrc, apiDest, { recursive: true });
    console.log('[Sync Dist] Funções serverless sincronizadas com sucesso para ./dist/api');
  }
} catch (err) {
  console.warn('[Sync Dist] Aviso durante sincronização de diretórios:', err.message);
}
