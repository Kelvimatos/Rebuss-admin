# REBUSS OPS — GUIA DE PREPARAÇÃO E DEPLOY EM PRODUÇÃO

Este documento estabelece o procedimento operacional padrão para implantação segura do **REBUSS OPS** em ambiente de produção.

---

## 1. Arquitetura de Produção

A aplicação REBUSS OPS foi estruturada para permitir **dois modelos de implantação flexíveis**:

1. **Modelo Unificado (Recomendado):**
   - Um único serviço Node.js/Express serve a REST API (`/api/*`), os arquivos estáticos de upload (`/uploads/*`) e a aplicação SPA React compilada (`client/dist/*`).
   - Elimina problemas de CORS, reduz custos de infraestrutura e simplifica o gerenciamento de certificados SSL/TLS.
   - Compatível com: **Render**, **Railway**, **Fly.io**, **AWS App Runner / ECS**, **GCP Cloud Run**, ou **VPS via Docker**.

2. **Modelo Desacoplado:**
   - **Frontend:** Hospedado no **Vercel** ou **Netlify** (apontando o root directory para `client`).
   - **Backend:** Hospedado no **Render**, **Railway** ou **Fly.io**.
   - Neste caso, a variável `ALLOWED_ORIGINS` e `FRONTEND_URL` no backend devem ser configuradas com o domínio exato do frontend.

---

## 2. Checklist de Variáveis de Ambiente de Produção

Configure as seguintes variáveis no painel da plataforma de hospedagem:

| Variável | Obrigatória | Descrição / Exemplo |
|---|---|---|
| `NODE_ENV` | **Sim** | Deve ser estritamente `production`. Ativa modo restrito, oculta stack traces e força cookies HTTPS. |
| `PORT` | **Sim** | Porta atribuída pela hospedagem (ex: `10000` no Render, `8080` ou atribuída via `$PORT`). |
| `DATABASE_URL` | **Sim** | URL de conexão PostgreSQL com SSL ativo (ex: `postgresql://user:pass@host:5432/db?sslmode=require`). |
| `JWT_SECRET` | **Sim** | Chave com mínimo de 32 caracteres (recomendado 64 hex). O servidor se recusa a iniciar se for omitida ou usar valor padrão. |
| `FRONTEND_URL` | **Sim** | URL pública do sistema (ex: `https://rebuss-ops.onrender.com`). |
| `ALLOWED_ORIGINS` | Opcional | Lista separada por vírgula de origens autorizadas pelo CORS (ex: `https://rebuss-ops.onrender.com,https://rebuss-ops.vercel.app`). |
| `INITIAL_ADMIN_EMAIL` | **Sim** | E-mail do administrador principal (`kelvimatosalves@gmail.com`). |
| `INITIAL_ADMIN_NAME` | Opcional | Nome de exibição (`Kelvi Matos`). |
| `GOOGLE_MAPS_API_KEY` | Opcional | Chave de API Google Maps com restrições de IP/HTTP referrers ativadas. Se omitida, usa OpenStreetMap/Nominatim. |

---

## 3. Passo a Passo de Implantação

### Opção A — Deploy no Render (Recomendado)

O repositório já possui o blueprint [`render.yaml`](./render.yaml) pré-configurado.

1. Acesse o painel do [Render Dashboard](https://dashboard.render.com).
2. Clique em **New +** > **Blueprint**.
3. Conecte o repositório `https://github.com/Kelvimatos/Rebuss-admin.git`.
4. O Render detectará automaticamente o arquivo `render.yaml` e criará:
   - Banco de Dados PostgreSQL gerenciado (`rebuss-ops-db`).
   - Web Service Node.js unificado (`rebuss-ops-app`).
5. Nas variáveis de ambiente do serviço web, preencha:
   - `FRONTEND_URL`: `https://[seu-app].onrender.com`
   - `ALLOWED_ORIGINS`: `https://[seu-app].onrender.com`
6. Clique em **Apply**. O Render executará o build e inicialização automática:
   ```bash
   # Build Command:
   npm install && cd client && npm install && cd .. && npx prisma generate && npm run build
   # Start Command:
   npx prisma migrate deploy && node dist/server.js
   ```

### Opção B — Deploy no Railway

1. Acesse o [Railway Dashboard](https://railway.app).
2. Clique em **New Project** > **Deploy from GitHub repo**.
3. Selecione o repositório `Rebuss-admin`.
4. Clique em **+ New** > **Database** > **Add PostgreSQL**.
5. No serviço do Rebuss-admin, vá em **Variables** e configure:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: *(Gere via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*
   - `FRONTEND_URL`: `https://${{RAILWAY_PUBLIC_DOMAIN}}`
   - `INITIAL_ADMIN_EMAIL`: `kelvimatosalves@gmail.com`
6. Vá em **Settings** > **Build & Deploy**:
   - Build Command: `npm install && cd client && npm install && cd .. && npx prisma generate && npm run build`
   - Start Command: `npx prisma migrate deploy && node dist/server.js`

### Opção C — Deploy via Docker / Container

1. Execute o build da imagem multi-estágio:
   ```bash
   docker build -t rebuss-ops:latest .
   ```
2. Execute o container em produção:
   ```bash
   docker run -d \
     --name rebuss-ops \
     -p 3001:3001 \
     -e NODE_ENV=production \
     -e DATABASE_URL="postgresql://user:pass@host:5432/rebuss_ops?sslmode=require" \
     -e JWT_SECRET="[CHAVE_SEGURA_64_HEX]" \
     -e FRONTEND_URL="https://seu-dominio.com" \
     rebuss-ops:latest
   ```

---

## 4. Bootstrap Inicial e Migrations

Após a primeira inicialização do serviço na nuvem:

1. As tabelas do banco serão criadas automaticamente pelo comando `npx prisma migrate deploy`.
2. Para garantir o provisionamento inicial das 24 equipes e dos usuários:
   - Abra o terminal / SSH web da hospedagem (ex: Render Shell ou Railway CLI).
   - Execute:
     ```bash
     npm run seed:admin
     npm run seed:teams
     npx tsx server/src/scripts/create-operator-users.ts
     ```
   *(Todos os scripts são 100% idempotentes e seguros contra duplicatas).*

---

## 5. Roteiro de Validação Pós-Deploy

Valide os seguintes itens no ambiente publicado:

- [ ] **1. HTTPS e SSL:** O domínio responde via HTTPS com certificado válido emitido.
- [ ] **2. Health Check:** A rota `GET /api/health` retorna status `200` com `{ status: "ok" }`.
- [ ] **3. Cabeçalhos de Segurança:** Resposta inclui `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` e **não** possui `X-Powered-By`.
- [ ] **4. Autenticação Administrativa:** Login do administrador `kelvimatosalves@gmail.com` funciona perfeitamente.
- [ ] **5. Autenticação de Operadores:** Login dos 4 operadores (`bruno@rebuss.com`, `francisco@rebuss.com`, `arthur@rebuss.com`, `matheus@rebuss.com`) funciona com a senha inicial.
- [ ] **6. Isolamento RBAC:** Operadores conseguem acessar Dashboard, Equipes Fixas e Gerador de Escalas, mas recebem `HTTP 403 Forbidden` ao tentar acessar `/api/users`.
- [ ] **7. Equipes Fixas:** As 24 equipes (19 SP, 4 RJ, 1 SJC) são listadas com seus 231 colaboradores.
- [ ] **8. Gerador de Escalas:** Endereços informados são localizados e vinculados com links desambiguados de transporte público.
- [ ] **9. Sigilo de Arquivos e Assets:** Inspecionar fontes no DevTools (`Ctrl+Shift+I`) e confirmar que `.env`, senhas ou strings de banco de dados não estão presentes nos arquivos `.js`.

---

## 6. Procedimento de Rollback

Se uma falha crítica for identificada no ambiente publicado:

1. **Rollback de Aplicação (Instantâneo):**
   - **Render / Railway / Vercel:** Na aba **Deployments / History**, selecione o deployment anterior bem-sucedido e clique em **Rollback**. O tráfego será redirecionado imediatamente para o container/build anterior.
2. **Rollback de Banco de Dados:**
   - As migrações do Rebuss Ops são puramente aditivas (inclusão de colunas nulas e novas tabelas).
   - Não reverta tabelas destrutivamente. Caso necessário, restaure o backup point-in-time (PITR) fornecido pelo serviço PostgreSQL gerenciado.

