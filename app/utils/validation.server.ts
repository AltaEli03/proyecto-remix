// app/utils/validation.server.ts

import { z } from 'zod';

// ESQUEMAS DE VALIDACIÓN

export const registerSchema = z.object({
    email: z
        .string()
        .email('Email inválido')
        .max(255, 'Email muy largo')
        .transform(v => v.toLowerCase().trim()),
    password: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(128, 'Contraseña muy larga')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una minúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número')
        .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
    confirmPassword: z
        .string()
        .min(1, 'Debes confirmar la contraseña'),
    name: z
        .string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(100, 'Nombre muy largo')
        .transform(v => sanitizeInput(v.trim()))
}).refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
});

export const loginSchema = z.object({
    email: z
        .string()
        .email('Email inválido')
        .transform(v => v.toLowerCase().trim()),
    password: z.string().min(1, 'La contraseña es requerida')
});

export const mfaCodeSchema = z.object({
    code: z
        .string()
        .length(6, 'El código debe tener 6 dígitos')
        .regex(/^\d+$/, 'El código solo debe contener números')
});

export const passwordResetSchema = z.object({
    password: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(128, 'Contraseña muy larga')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una minúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número')
        .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
});

export const changePasswordSchema = z.object({
    currentPassword: z
        .string()
        .min(1, 'La contraseña actual es requerida'),
    password: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .max(128, 'Contraseña muy larga')
        .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'Debe contener al menos una minúscula')
        .regex(/[0-9]/, 'Debe contener al menos un número')
        .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
}).refine(data => data.currentPassword !== data.password, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['password']
});

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .email('Email inválido')
        .transform(v => v.toLowerCase().trim())
});

// HELPER DE VALIDACIÓN

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: Record<string, string> };

export function validateFormData<T>(
    schema: z.ZodSchema<T>,
    formData: FormData
): ValidationResult<T> {
    const data: Record<string, unknown> = {};

    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }

    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!errors[path]) {
            errors[path] = issue.message;
        }
    }

    return { success: false, errors };
}

// SANITIZACIÓN

export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>'"]/g, '')           // HTML/SQL chars
        .replace(/javascript:/gi, '')      // JS protocol
        .replace(/on\w+\s*=/gi, '')        // Event handlers
        .replace(/\0/g, '')               // Null bytes
        .trim()
        .slice(0, 10000);                 // Límite de longitud
}