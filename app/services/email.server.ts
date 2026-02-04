import nodemailer from 'nodemailer';

// CONFIGURACIÓN DEL TRANSPORTE

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
const APP_NAME = process.env.APP_NAME;
const APP_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : process.env.APP_URL;

// PLANTILLAS DE EMAIL

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
            }
            .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 2px solid #4F46E5;
            }
            .content {
                padding: 30px 0;
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
            .footer {
                text-align: center;
                padding: 20px 0;
                color: #666;
                font-size: 12px;
                border-top: 1px solid #eee;
            }
            .code {
                background: #f4f4f4;
                padding: 15px 25px;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 4px;
                text-align: center;
                border-radius: 6px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${APP_NAME}</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${APP_NAME}. Todos los derechos reservados.</p>
            <p>Si no solicitaste este email, puedes ignorarlo.</p>
        </div>
    </body>
    </html>
    `;
}

// EMAILS ESPECÍFICOS

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${APP_URL}/auth/verify-email?token=${token}`;

    const content = `
        <h2>¡Bienvenido a ${APP_NAME}!</h2>
        <p>Gracias por registrarte. Para completar tu registro, por favor verifica tu email haciendo clic en el siguiente botón:</p>
        <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verificar Email</a>
        </p>
        <p><strong>Este enlace expira en 24 horas.</strong></p>
    `;

    await transporter.sendMail({
        from: `"${APP_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject: `Verifica tu email - ${APP_NAME}`,
        html: baseTemplate(content)
    });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

    const content = `
        <h2>Restablecer Contraseña</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no fuiste tú, ignora este email.</p>
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
        </p>
        <p><strong>Este enlace expira en 1 hora.</strong></p>
    `;

    await transporter.sendMail({
        from: `"${APP_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject: `Restablecer contraseña - ${APP_NAME}`,
        html: baseTemplate(content)
    });
}

export async function sendMFAEnabledEmail(email: string): Promise<void> {
    const content = `
        <h2>Autenticación de Dos Factores Activada</h2>
        <p>La autenticación de dos factores (2FA) ha sido activada en tu cuenta.</p>
        <p>A partir de ahora, necesitarás ingresar un código de tu aplicación de autenticación además de tu contraseña para iniciar sesión.</p>
        <p><strong>Si no activaste esta función, contacta a soporte inmediatamente.</strong></p>
    `;

    await transporter.sendMail({
        from: `"${APP_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject: `2FA Activado - ${APP_NAME}`,
        html: baseTemplate(content)
    });
}

export async function sendLoginAlertEmail(
    email: string,
    deviceInfo: string,
    ipAddress: string
): Promise<void> {
    const content = `
        <h2>Nuevo Inicio de Sesión Detectado</h2>
        <p>Se ha detectado un nuevo inicio de sesión en tu cuenta:</p>
        <ul>
            <li><strong>Dispositivo:</strong> ${deviceInfo}</li>
            <li><strong>IP:</strong> ${ipAddress}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
        </ul>
        <p>Si no fuiste tú, te recomendamos cambiar tu contraseña inmediatamente.</p>
    `;

    await transporter.sendMail({
        from: `"${APP_NAME}" <${FROM_EMAIL}>`,
        to: email,
        subject: `Nuevo inicio de sesión - ${APP_NAME}`,
        html: baseTemplate(content)
    });
}