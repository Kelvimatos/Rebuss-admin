# REBUSS OPS — Plataforma Administrativa & Operacional

> Sistema corporativo centralizado para gestão operacional da REBUSS, integrando gerenciamento de **Equipes Fixas** (RJ, SP, SJC), administração de usuários com controle de permissões (ADMIN / OPERADOR) e persistência em banco relacional **PostgreSQL** com **Prisma ORM**.

---

## 1. Visão Geral e Arquitetura

O **REBUSS OPS** foi desenvolvido seguindo boas práticas de arquitetura full-stack moderna e segurança de aplicações SaaS corporativas:

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS com tema shadcn/ui (dark mode por padrão, com alternador de tema claro/escuro), Lucide React e React Router.
- **Backend**: Node.js, Express, TypeScript, Zod para validação rigorosa de schemas, cookies seguros HttpOnly, autenticação JWT com hash Bcrypt e proteção contra ataques de força bruta.
- **Banco de Dados**: PostgreSQL com Prisma ORM e migrations versionadas (`prisma/migrations`).
- **Módulo Operacional**: **Equipes Fixas** com filtros por região (RJ, SP, SJC), gestão completa de membros, preservação de zeros à esquerda em códigos operacionais, reordenação com persistência e cópia padronizada para escalas.
- **Módulo Integrado**: **Gerador de Escalas** original preservado integralmente, catalogado e acessível via painel.

---

## 2. Estrutura do Projeto

```text
Rebuss-admin/
├── client/                      # Frontend Vite + React + Tailwind + shadcn
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis (UI, layout, shared)
│   │   ├── context/             # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/               # Login, Dashboard, FixedTeams, Users, GeradorEscalasTool
│   │   ├── services/            # Clientes HTTP (API, Auth, Teams, Users, Dashboard)
│   │   ├── routes/              # Rotas públicas, privadas e com guarda ADMIN
│   │   ├── types/               # Tipagens TypeScript completas
│   │   └── main.tsx
│   └── package.json
├── server/                      # Backend Express + TypeScript
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # Login, Logout, Me, Rate Limiting, JWT
│   │   │   ├── users/           # Gestão de usuários e permissões (ADMIN)
│   │   │   ├── fixed-teams/     # CRUD Equipes Fixas e Membros com reordenação
│   │   │   ├── tools/           # Catálogo de ferramentas do sistema
│   │   │   └── dashboard/       # Métricas consolidadas e log de auditoria
│   │   ├── middleware/          # Autenticação, autorização RBAC, validação Zod, erros
│   │   ├── lib/                 # Prisma client e registrador de auditoria
│   │   ├── scripts/             # Script seguro de bootstrap do primeiro administrador
│   │   └── server.ts            # Servidor principal com CORS e cookies seguros
├── prisma/
│   ├── schema.prisma            # Schemas de Usuario, EquipeFixa, MembroEquipeFixa, etc.
│   └── migrations/              # Migrations versionadas aplicadas no PostgreSQL
├── test/
│   └── e2e-verification.ts      # Suíte de testes automatizados E2E
├── Gerador-de-Escala-Rebuss-main/ # Ferramenta existente integrada e preservada
├── .env                         # Variáveis de ambiente locais (ignorado no git)
├── .env.example                 # Modelo de configuração para novos ambientes
└── package.json                 # Scripts unificados de desenvolvimento e build
```

---

## 3. Pré-Requisitos

- **Node.js** v20+ ou v24+
- **PostgreSQL** instalado e ativo localmente (ou em container/serviço na nuvem)
- Banco de dados criado no PostgreSQL com o nome: `rebuss_ops`

---

## 4. Configuração Passo a Passo

### 1. Clonar ou Acessar o Diretório

```bash
cd "c:\Users\Kelvi\Desktop\Projetos estudo\Rebuss-admin"
```

### 2. Configurar o Arquivo `.env`

Copie o modelo de exemplo caso ainda não tenha o `.env`:

```bash
cp .env.example .env
```

Edite o `.env` com a sua senha do PostgreSQL e os segredos da aplicação:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/rebuss_ops"
PORT=3001
JWT_SECRET="rebuss_ops_secret_key_jwt_auth_session_token_2026_secure"
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Dados para o bootstrap inicial do administrador
INITIAL_ADMIN_EMAIL="kelvimatosalves@gmail.com"
INITIAL_ADMIN_NAME="Administrador REBUSS"
```

### 3. Instalar Dependências

Instale as dependências da raiz e do cliente:

```bash
npm install
cd client && npm install && cd ..
```

### 4. Executar Migrations no PostgreSQL

Execute a migration para criar todas as tabelas e relacionamentos com integridade referencial:

```bash
npm run prisma:migrate
```

Para gerar o cliente Prisma atualizado:

```bash
npm run prisma:generate
```

### 5. Criar ou Conciliar o Administrador (Bootstrap Seguro)

Execute o script de bootstrap idempotente:

```bash
npm run seed:admin
```

O script criará ou conciliará com segurança o usuário com perfil `ADMIN` (`kelvimatosalves@gmail.com`) e registrará as ferramentas no catálogo, sem gerar contas duplicadas.

---

## 5. Como Iniciar a Aplicação

### Iniciar Frontend e Backend Simultaneamente:

```bash
npm run dev
```

Este comando inicia:
- **Backend API**: `http://localhost:3001`
- **Frontend Vite**: `http://localhost:5173`

Ou inicie individualmente se preferir:
- Backend: `npm run dev:server`
- Frontend: `npm run dev:client`

---

## 6. Acesso ao Sistema e Credenciais

1. Acesse no navegador: `http://localhost:5173/login`
2. Conta administrativa principal:
   - **E-mail**: `kelvimatosalves@gmail.com`
   - **Senha**: Configurada via fluxo seguro de redefinição de credenciais na tela de Login (`Redefinir ou configurar senha`) ou na página `Meu Perfil`.
3. O painel será carregado com tema escuro elegante, métricas em tempo real e acesso imediato à ferramenta **Equipes Fixas**.

---

## 7. Suíte de Testes Automatizados E2E

Para rodar a verificação de ponta a ponta com 16 asserções obrigatórias:

```bash
npx tsx test/e2e-verification.ts
```

Testes inclusos na suíte:
- Validação de Health Check da API
- Tentativa de login inválida com resposta genérica HTTP 401
- Login administrativo válido com token JWT assinado
- Criação e validação de equipes nas 3 regiões obrigatórias (RJ, SP, SJC)
- Cadastro de membros preservando zeros à esquerda no número (`"01"`, `"02"`, `"03"`)
- Reordenação transacional de membros e persistência no PostgreSQL
- Validação do texto padronizado gerado para cópia da equipe
- Criação de usuário OPERADOR e bloqueio de rotas administrativas (HTTP 403 Forbidden)
- Exclusão com confirmação e integridade em cascata eliminando membros associados

---

## 8. Resolução de Dúvidas e Erros Comuns

- **Erro de conexão `P1001: Can't reach database server`**: Verifique se o serviço do PostgreSQL está iniciado no Windows (serviço `postgresql-x64-XX`) e se a porta 5432 está acessível.
- **Erro de senha no PostgreSQL**: Atualize a variável `DATABASE_URL` no `.env` com a senha exata do usuário `postgres`.
- **Porta em uso**: O backend roda na porta 3001 e o frontend na 5173. Se precisar alterar, modifique `PORT` no `.env` e o proxy em `client/vite.config.ts`.

