import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .email("Formato de e-mail inválido")
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(1, "Senha é obrigatória"),
});

export const updateProfileSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "O nome deve ter no mínimo 2 caracteres")
    .max(100, "O nome não pode exceder 100 caracteres"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z
    .string()
    .min(8, "A nova senha deve ter no mínimo 8 caracteres")
    .max(100, "A nova senha não pode exceder 100 caracteres"),
});

export const requestPasswordResetSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .email("Formato de e-mail inválido")
    .transform((val) => val.toLowerCase()),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1, "Token de redefinição é obrigatório"),
  newPassword: z
    .string()
    .min(8, "A nova senha deve ter no mínimo 8 caracteres")
    .max(100, "A nova senha não pode exceder 100 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
