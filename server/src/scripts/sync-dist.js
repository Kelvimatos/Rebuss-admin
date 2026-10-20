const fs = require('fs');
const path = require('path');

try {
  const projectRoot = path.resolve(__dirname, '../../../');
  const src = path.resolve(projectRoot, 'client/dist');
  const dest = path.resolve(projectRoot, 'dist');

  // 1. Sincroniza o frontend estático do Vite para dist/
  if (fs.existsSync(src)) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.cpSync(src, dest, { recursive: true });
    console.log('[Sync Dist] Frontend estático sincronizado com sucesso para ./dist');
  } else {
    console.warn('[Sync Dist] Aviso: client/dist ainda não existe para sincronização.');
  }

  // 2. Sincroniza as funções serverless para dist/api (caso Vercel procure dentro do outputDirectory)
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
