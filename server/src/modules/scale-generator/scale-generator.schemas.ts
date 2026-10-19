import { z } from "zod";

export const locateAddressSchema = z.object({
  input: z
    .string()
    .trim()
    .min(3, "Informe um endereço válido (mínimo de 3 caracteres)."),
  cityHint: z.string().trim().optional(),
  stateHint: z.string().trim().optional(),
  selectedLat: z.number().optional(),
  selectedLon: z.number().optional(),
  selectedDisplayName: z.string().optional(),
  forceConfirmed: z.boolean().optional(),
});

export type LocateAddressInput = z.infer<typeof locateAddressSchema>;
