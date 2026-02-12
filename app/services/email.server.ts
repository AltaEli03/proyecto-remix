// app/services/email.server.ts

import nodemailer from 'nodemailer';

// =====================
// CONFIGURACIÓN
// =====================

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const FROM_EMAIL = process.env.FROM_EMAIL;
const APP_NAME = process.env.APP_NAME || 'MyApp';
const APP_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : process.env.APP_URL;

if (!APP_URL) throw new Error("APP_URL debe estar definido en producción");
if (!FROM_EMAIL) throw new Error("FROM_EMAIL debe estar definido");

// =====================
// PLANTILLA BASE
// =====================

function baseTemplate(content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${APP_NAME}</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
            }
            .container {
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                padding: 24px 20px;
                background: #4F46E5;
                color: white;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
            }
            .content {
                padding: 32px 24px;
            }
            .button {
                display: inline-block;
                background: #4F46E5;
                color: white !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
            }
            .button:hover {
                background: #4338CA;
            }
            .footer {
                text-align: center;
                padding: 20px;
                color: #6b7280;
                font-size: 12px;
                border-top: 1px solid #e5e7eb;
            }
            .code {
                background: #f3f4f6;
                padding: 15px 25px;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 4px;
                text-align: center;
                border-radius: 6px;
                margin: 20px 0;
                font-family: monospace;
            }
            .warning {
                background: #FEF3C7;
                border: 1px solid #F59E0B;
                border-radius: 6px;
                padding: 12px 16px;
                margin: 16px 0;
                font-size: 14px;
            }
            .info-list {
                background: #f3f4f6;
                border-radius: 6px;
                padding: 16px 20px;
                margin: 16px 0;
            }
            .info-list li {
                margin: 4px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${APP_NAME}</h1>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.</p>
                <p>Si no solicitaste este email, puedes ignorarlo de forma segura.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// =====================
// HELPER DE ENVÍO
// =====================

async function sendEmail(
    to: string,
    subject: string,
    htmlContent: string
): Promise<void> {
    try {
        await transporter.sendMail({
            from: `"${APP_NAME}" <${FROM_EMAIL}>`,
            to,
            subject,
            html: baseTemplate(htmlContent)
        });
    } catch (error) {
        console.error(`Error enviando email a ${to}:`, error);
        throw error;
    }
}

// =====================
// EMAILS ESPECÍFICOS
// =====================

export async function sendVerificationEmail(
    email: string,
    token: string
): Promise<void> {
    const verifyUrl = `${APP_URL}/auth/verify-email?token=${token}`;

    const content = `
        <h2>¡Bienvenido a ${APP_NAME}!</h2>
        <p>Gracias por registrarte. Para completar tu registro, por favor verifica tu email:</p>
        <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verificar Email</a>
        </p>
        <p><strong>Este enlace expira en 24 horas.</strong></p>
        <p style="font-size: 12px; color: #6b7280;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${verifyUrl}" style="color: #4F46E5; word-break: break-all;">${verifyUrl}</a>
        </p>
    `;

    await sendEmail(
        email,
        `Verifica tu email - ${APP_NAME}`,
        content
    );
}

export async function sendPasswordResetEmail(
    email: string,
    token: string
): Promise<void> {
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

    const content = `
        <h2>Restablecer Contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
        </p>
        <p><strong>Este enlace expira en 1 hora.</strong></p>
        <div class="warning">
            ⚠️ Si no solicitaste este cambio, ignora este email. Tu contraseña no cambiará.
        </div>
        <p style="font-size: 12px; color: #6b7280;">
            Si el botón no funciona, copia y pega este enlace:<br>
            <a href="${resetUrl}" style="color: #4F46E5; word-break: break-all;">${resetUrl}</a>
        </p>
    `;

    await sendEmail(
        email,
        `Restablecer contraseña - ${APP_NAME}`,
        content
    );
}

export async function sendMFAEnabledEmail(email: string): Promise<void> {
    const content = `
        <h2>Autenticación de Dos Factores Activada ✅</h2>
        <p>La autenticación de dos factores (2FA) ha sido activada en tu cuenta.</p>
        <p>A partir de ahora, necesitarás ingresar un código de tu aplicación 
        de autenticación además de tu contraseña para iniciar sesión.</p>
        <div class="warning">
            ⚠️ Si no activaste esta función, contacta a soporte inmediatamente.
        </div>
    `;

    await sendEmail(
        email,
        `2FA Activado - ${APP_NAME}`,
        content
    );
}

export async function sendMFADisabledEmail(email: string): Promise<void> {
    const content = `
        <h2>Autenticación de Dos Factores Desactivada ⚠️</h2>
        <p>La autenticación de dos factores (2FA) ha sido desactivada en tu cuenta.</p>
        <p>Tu cuenta ahora solo está protegida por tu contraseña.</p>
        <div class="warning">
            ⚠️ Si no desactivaste esta función, cambia tu contraseña 
            inmediatamente y contacta a soporte.
        </div>
    `;

    await sendEmail(
        email,
        `2FA Desactivado - ${APP_NAME}`,
        content
    );
}

export async function sendLoginAlertEmail(
    email: string,
    deviceInfo: string,
    ipAddress: string
): Promise<void> {
    const content = `
        <h2>Nuevo Inicio de Sesión Detectado</h2>
        <p>Se ha detectado un nuevo inicio de sesión en tu cuenta:</p>
        <div class="info-list">
            <ul>
                <li><strong>Dispositivo:</strong> ${deviceInfo}</li>
                <li><strong>IP:</strong> ${ipAddress}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                })}</li>
            </ul>
        </div>
        <div class="warning">
            ⚠️ Si no fuiste tú, te recomendamos cambiar tu contraseña 
            inmediatamente y activar la autenticación de dos factores.
        </div>
    `;

    await sendEmail(
        email,
        `Nuevo inicio de sesión - ${APP_NAME}`,
        content
    );
}

export async function sendPasswordChangedEmail(
    email: string
): Promise<void> {
    const content = `
        <h2>Contraseña Actualizada</h2>
        <p>Tu contraseña ha sido cambiada exitosamente.</p>
        <p>Todas las sesiones activas han sido cerradas. 
        Necesitarás iniciar sesión nuevamente con tu nueva contraseña.</p>
        <div class="warning">
            ⚠️ Si no realizaste este cambio, contacta a soporte inmediatamente.
        </div>
    `;

    await sendEmail(
        email,
        `Contraseña actualizada - ${APP_NAME}`,
        content
    );
}

export async function sendAccountDeletedEmail(
    email: string
): Promise<void> {
    const content = `
        <h2>Cuenta Eliminada</h2>
        <p>Tu cuenta en ${APP_NAME} ha sido eliminada exitosamente.</p>
        <p>Todos tus datos han sido eliminados de nuestros sistemas.</p>
        <p>Si deseas volver a usar ${APP_NAME} en el futuro, 
        puedes crear una nueva cuenta en cualquier momento.</p>
    `;

    await sendEmail(
        email,
        `Cuenta eliminada - ${APP_NAME}`,
        content
    );
}

export async function sendSuspiciousActivityEmail(
    email: string,
    reasons: string[],
    ipAddress: string
): Promise<void> {
    const reasonMessages: Record<string, string> = {
        'multiple_ips_failed_login': 'Múltiples intentos fallidos desde diferentes ubicaciones',
        'new_ip_login': 'Inicio de sesión desde una nueva ubicación',
        'frequent_password_changes': 'Múltiples cambios de contraseña recientes',
        'refresh_token_reuse': 'Posible intento de secuestro de sesión'
    };

    const reasonsList = reasons
        .map(r => reasonMessages[r] || r)
        .map(r => `<li>${r}</li>`)
        .join('');

    const content = `
        <h2>⚠️ Actividad Sospechosa Detectada</h2>
        <p>Hemos detectado actividad inusual en tu cuenta:</p>
        <div class="info-list">
            <ul>${reasonsList}</ul>
        </div>
        <p><strong>IP detectada:</strong> ${ipAddress}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <div class="warning">
            Te recomendamos:
            <ul>
                <li>Cambiar tu contraseña inmediatamente</li>
                <li>Activar la autenticación de dos factores si no la tienes</li>
                <li>Revisar las sesiones activas en tu cuenta</li>
            </ul>
        </div>
    `;

    await sendEmail(
        email,
        `⚠️ Actividad sospechosa - ${APP_NAME}`,
        content
    );
}