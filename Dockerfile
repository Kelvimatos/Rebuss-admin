# ==============================================================================
# REBUSS OPS — MULTI-STAGE DOCKERFILE DE PRODUÇÃO
# ==============================================================================

# Estágio 1: Build de Dependências e Compilação
FROM node:22-alpine AS builder

WORKDIR /app

# Instala ferramentas necessárias para compilação nativa
RUN apk add --no-cache openssl libc6-compat

# Copia manifestos de pacotes
COPY package*.json ./
COPY client/package*.json ./client/

# Instala todas as dependências (raiz e cliente)
RUN npm ci
RUN cd client && npm ci

# Copia o código fonte do projeto
COPY prisma ./prisma
COPY server ./server
COPY client ./client
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY Gerador-de-Escala-Rebuss-main ./Gerador-de-Escala-Rebuss-main

# Gera o client do Prisma e compila cliente e servidor
RUN npx prisma generate
RUN npm run build

# ==============================================================================
# Estágio 2: Imagem Final Leve e Segura para Produção
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache openssl dumb-init

# Cria usuário não-root para execução segura
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 rebuss

# Copia manifests e instala apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copia Prisma schema e cliente gerado
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copia os artefatos compilados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/Gerador-de-Escala-Rebuss-main ./Gerador-de-Escala-Rebuss-main

# Cria diretório de uploads com permissão para o usuário rebuss
RUN mkdir -p uploads/avatars && chown -R rebuss:nodejs /app

USER rebuss

EXPOSE 3001

# Inicia com dumb-init para gerenciamento adequado de sinais POSIX
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

