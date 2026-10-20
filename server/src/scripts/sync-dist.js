const fs = require('fs');
const path = require('path');

try {
  const projectRoot = path.resolve(__dirname, '../../../');
  const src = path.resolve(projectRoot, 'client/dist');
  const dest = path.resolve(projectRoot, 'dist');

  if (fs.existsSync(src)) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.cpSync(src, dest, { recursive: true });
    console.log('[Sync Dist] Frontend estático sincronizado com sucesso para ./dist');
  } else {
    console.warn('[Sync Dist] Aviso: client/dist ainda não existe para sincronização.');
  }
} catch (err) {
  console.warn('[Sync Dist] Aviso durante sincronização de diretórios:', err.message);
}

