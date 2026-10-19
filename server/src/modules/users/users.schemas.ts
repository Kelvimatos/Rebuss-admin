import { z } from "zod";

export const createUserSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .transform((val) => val.toLowerCase()),
  senha: z.string().min(6, "A senha deve conter ao menos 6 caracteres"),
  perfil: z.enum(["ADMIN", "OPERADOR"], {
    message: "Perfil deve ser ADMIN ou OPERADOR",
  }),
  ativo: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .transform((val) => val.toLowerCase())
    .optional(),
  senha: z.string().min(6, "A senha deve conter ao menos 6 caracteres").optional(),
  perfil: z.enum(["ADMIN", "OPERADOR"]).optional(),
  ativo: z.boolean().optional(),
});

export const updateUserStatusSchema = z.object({
  ativo: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

