// app/utils/errors.server.ts

export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message = 'No autenticado') {
        super(message, 'UNAUTHENTICATED', 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 'UNAUTHORIZED', 403);
    }
}

export class AccountLockedError extends AppError {
    constructor(public lockedUntil: Date) {
        super('Cuenta bloqueada', 'ACCOUNT_LOCKED', 423);
    }
}

export class EmailNotVerifiedError extends AppError {
    constructor() {
        super('Email no verificado', 'EMAIL_NOT_VERIFIED', 403);
    }
}

export class MFARequiredError extends AppError {
    constructor(public userId: number) {
        super('MFA requerido', 'MFA_REQUIRED', 403);
    }
}

export class RateLimitError extends AppError {
    constructor(public retryAfter: number) {
        super('Demasiados intentos', 'RATE_LIMITED', 429);
    }
}

export class TokenReuseError extends AppError {
    constructor() {
        super('Token reutilizado - posible robo', 'TOKEN_REUSE', 401);
    }
}

export class PasswordReuseError extends AppError {
    constructor() {
        super(
            'No puedes reutilizar contraseñas anteriores',
            'PASSWORD_REUSED',
            400
        );
    }
}

// Mapeo centralizado de errores a respuestas
export function errorToResponse(error: unknown): {
    errors: Record<string, string>;
} {
    if (error instanceof RateLimitError) {
        const minutes = Math.ceil(error.retryAfter / 60);
        return {
            errors: {
                general: `Demasiados intentos. Intenta en ${minutes} minuto${minutes > 1 ? 's' : ''}.`
            }
        };
    }

    if (error instanceof AccountLockedError) {
        return {
            errors: {
                general: 'Cuenta bloqueada temporalmente. Intenta más tarde.'
            }
        };
    }

    if (error instanceof EmailNotVerifiedError) {
        return {
            errors: {
                general: 'Por favor verifica tu email antes de iniciar sesión'
            }
        };
    }

    if (error instanceof PasswordReuseError) {
        return {
            errors: {
                password: error.message
            }
        };
    }

    if (error instanceof AppError) {
        return {
            errors: { general: error.message }
        };
    }

    console.error('Error no manejado:', error);
    return {
        errors: { general: 'Ocurrió un error inesperado' }
    };
}