-- AlterTable
ALTER TABLE "equipes_fixas" ADD COLUMN     "supervisor" TEXT;

-- AlterTable
ALTER TABLE "membros_equipes_fixas" ADD COLUMN     "funcao" TEXT,
ADD COLUMN     "matricula" TEXT,
ALTER COLUMN "numero" DROP NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "avatarUrl" TEXT;

-- CreateIndex
CREATE INDEX "membros_equipes_fixas_matricula_idx" ON "membros_equipes_fixas"("matricula");
