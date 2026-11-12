import { z } from "zod";

/** Esquemas de entrada compartidos por el Worker (validación) y la web (formularios). */

export const nameSchema = z.string().trim().min(2, "Escribe tu nombre (mínimo 2 letras).").max(80, "Máximo 80 caracteres.");
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^9\d{8}$/, "Escribe un celular de 9 dígitos que empiece con 9.");
export const emailSchema = z.string().trim().toLowerCase().email("Escribe un correo válido.").max(120);
export const passwordSchema = z
  .string()
  .min(8, "Usa al menos 8 caracteres.")
  .max(128, "Máximo 128 caracteres.");

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña."),
});

export const addressSchema = z.object({
  line: z.string().trim().max(160, "Máximo 160 caracteres."),
  district: z.string().trim().max(80, "Máximo 80 caracteres."),
  reference: z.string().trim().max(160, "Máximo 160 caracteres."),
});

export const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: addressSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual."),
  newPassword: passwordSchema,
});
