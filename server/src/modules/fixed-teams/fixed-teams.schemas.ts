import { z } from "zod";

export const createTeamSchema = z.object({
  nome: z.string().trim().min(2, "Nome da equipe deve ter ao menos 2 caracteres"),
  regiao: z.string().trim().min(2, "Região é obrigatória (ex: RJ, SP, SJC)"),
  supervisor: z.string().trim().optional().nullable(),
  descricao: z.string().trim().optional().nullable(),
  ativo: z.boolean().default(true),
});

export const updateTeamSchema = z.object({
  nome: z.string().trim().min(2, "Nome da equipe deve ter ao menos 2 caracteres").optional(),
  regiao: z.string().trim().min(2, "Região é obrigatória").optional(),
  supervisor: z.string().trim().optional().nullable(),
  descricao: z.string().trim().optional().nullable(),
  ativo: z.boolean().optional(),
});

export const queryTeamsSchema = z.object({
  search: z.string().optional(),
  regiao: z.string().optional(),
  ativo: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
});

export const createMemberSchema = z.object({
  nome: z.string().trim().min(2, "Nome do membro deve ter ao menos 2 caracteres"),
  funcao: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  matricula: z.string().trim().optional().nullable(),
  numero: z.string().trim().optional().nullable(),
  ordem: z.number().int().optional(),
});

export const updateMemberSchema = z.object({
  nome: z.string().trim().min(2, "Nome do membro deve ter ao menos 2 caracteres").optional(),
  funcao: z.string().trim().optional(),
  cargo: z.string().trim().optional(),
  matricula: z.string().trim().optional().nullable(),
  numero: z.string().trim().optional().nullable(),
  ordem: z.number().int().optional(),
});

export const reorderMembersSchema = z.object({
  members: z
    .array(
      z.object({
        id: z.string().uuid("ID inválido"),
        ordem: z.number().int(),
      })
    )
    .min(1, "Lista de membros para ordenação não pode ser vazia"),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type QueryTeamsInput = z.infer<typeof queryTeamsSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ReorderMembersInput = z.infer<typeof reorderMembersSchema>;
