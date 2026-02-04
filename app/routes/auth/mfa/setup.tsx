// app/routes/auth/mfa/setup.tsx
import {
    Form,
    redirect,
    useLoaderData,
    useActionData,
    useNavigation,
    data,
    Link
} from "react-router";
import { useState, useEffect, useRef } from "react";
import {
    CheckCircle,
    Copy,
    Download,
    ChevronLeft,
    Shield,
    Smartphone,
    Key,
    QrCode,
    Eye,
    EyeOff,
    Info,
    AlertTriangle
} from "lucide-react";
import type { Route } from "./+types/setup";
import { Alert } from "~/components/Alert";

// ------------------ Meta ------------------
export function meta() {
    return [
        { title: "Configurar 2FA | Mi App" },
        { name: "description", content: "Configura la autenticación de dos factores" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" }
    ];
}

// ------------------ Tipos ------------------
interface LoaderDataStep1 {
    step: "scan";
    qrCode: string;
    secret: string;
    email: string;
}

interface LoaderDataStep2 {
    step: "backup";
    backupCodes: string[];
}

interface LoaderDataStep3 {
    step: "complete";
}

type LoaderData = LoaderDataStep1 | LoaderDataStep2 | LoaderDataStep3;

interface ActionError {
    error: string;
}

interface ActionSuccess {
    success: true;
}

type ActionData = ActionError | ActionSuccess;

// ------------------ Loader ------------------
export async function loader({ request }: Route.LoaderArgs) {
    const { requireAuth } = await import("~/utils/auth.guard");
    const { generateMFASecret, generateMFAUri } = await import("~/utils/auth.server");
    const { getSession, commitSession } = await import("~/utils/sessions.server");
    const QRCode = await import("qrcode");

    const { user } = await requireAuth(request);
    const url = new URL(request.url);
    const step = url.searchParams.get("step") || "scan";
    const session = await getSession(request.headers.get("Cookie"));

    const setupInProgress = session.get("mfa_setup_secret");

    if (user.mfaEnabled && !setupInProgress && step !== "complete") {
        throw redirect("/settings?mfa=already-enabled");
    }

    if (step === "scan") {
        const secret = generateMFASecret();
        const uri = generateMFAUri(secret, user.email);
        const qrCode = await QRCode.toDataURL(uri);

        session.set("mfa_setup_secret", secret);
        session.unset("mfa_backup_codes");
        session.unset("mfa_code_verified");

        return data<LoaderDataStep1>(
            {
                step: "scan",
                qrCode,
                secret,
                email: user.email
            },
            {
                headers: {
                    "Set-Cookie": await commitSession(session)
                }
            }
        );
    }

    if (step === "backup") {
        const isVerified = session.get("mfa_code_verified");
        const backupCodes = session.get("mfa_backup_codes") as string[] | undefined;
        const secret = session.get("mfa_setup_secret");

        if (!isVerified || !backupCodes || !secret) {
            throw redirect("/auth/mfa/setup");
        }

        return data<LoaderDataStep2>(
            {
                step: "backup",
                backupCodes
            },
            {
                headers: {
                    "Set-Cookie": await commitSession(session)
                }
            }
        );
    }

    if (step === "complete") {
        session.unset("mfa_setup_secret");
        session.unset("mfa_backup_codes");
        session.unset("mfa_code_verified");

        return data<LoaderDataStep3>(
            { step: "complete" },
            {
                headers: {
                    "Set-Cookie": await commitSession(session)
                }
            }
        );
    }

    throw redirect("/auth/mfa/setup");
}

// ------------------ Action ------------------
export async function action({ request }: Route.ActionArgs) {
    const { requireAuth } = await import("~/utils/auth.guard");
    const {
        verifyMFAToken,
        generateBackupCodes,
        storeBackupCodes
    } = await import("~/utils/auth.server");
    const { getSession, commitSession } = await import("~/utils/sessions.server");
    const { execute } = await import("~/utils/db.server");
    const { logSecurityEvent } = await import("~/services/security.server");
    const { sendMFAEnabledEmail } = await import("~/services/email.server");

    const { user } = await requireAuth(request);
    const session = await getSession(request.headers.get("Cookie"));
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    if (intent === "verify-code") {
        const code = formData.get("code") as string;
        const secret = session.get("mfa_setup_secret");

        if (!secret) {
            return data<ActionError>(
                { error: "La sesión expiró. Por favor, recarga la página e inténtalo de nuevo." },
                { status: 400 }
            );
        }

        if (!code || !/^\d{6}$/.test(code)) {
            return data<ActionError>(
                { error: "El código debe tener exactamente 6 dígitos." },
                { status: 400 }
            );
        }

        const isValid = await verifyMFAToken(code, secret);

        if (!isValid) {
            return data<ActionError>(
                { error: "Código incorrecto. Asegúrate de usar el código actual de tu app." },
                { status: 400 }
            );
        }

        const backupCodes = generateBackupCodes(10);

        session.set("mfa_code_verified", true);
        session.set("mfa_backup_codes", backupCodes);

        return redirect("/auth/mfa/setup?step=backup", {
            headers: {
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    if (intent === "confirm-backup") {
        const confirmed = formData.get("confirmed") === "true";

        if (!confirmed) {
            return data<ActionError>(
                { error: "Debes confirmar que guardaste los códigos de respaldo para continuar." },
                { status: 400 }
            );
        }

        const secret = session.get("mfa_setup_secret");
        const backupCodes = session.get("mfa_backup_codes") as string[] | undefined;
        const isVerified = session.get("mfa_code_verified");

        if (!secret || !backupCodes || !isVerified) {
            return data<ActionError>(
                { error: "La sesión expiró. Por favor, comienza la configuración de nuevo." },
                { status: 400 }
            );
        }

        try {
            await execute(
                "UPDATE users SET mfa_enabled = TRUE, mfa_secret = ? WHERE id = ?",
                [secret, user.id]
            );

            await storeBackupCodes(user.id, backupCodes);
            await logSecurityEvent("mfa_enabled", user.id, request);

            sendMFAEnabledEmail(user.email).catch(e => {
                console.error("Error enviando email de MFA habilitado:", e);
            });

        } catch (error) {
            console.error("Error activando MFA:", error);
            return data<ActionError>(
                { error: "Ocurrió un error al activar 2FA. Por favor, inténtalo de nuevo." },
                { status: 500 }
            );
        }

        session.unset("mfa_setup_secret");
        session.unset("mfa_backup_codes");
        session.unset("mfa_code_verified");

        return redirect("/auth/mfa/setup?step=complete", {
            headers: {
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    return data<ActionError>(
        { error: "Acción no válida." },
        { status: 400 }
    );
}

// ------------------ Layout Wrapper ------------------
function SetupLayout({
    children,
    showBackButton = true,
    currentStep = 1
}: {
    children: React.ReactNode;
    showBackButton?: boolean;
    currentStep?: number;
}) {
    return (
        <main className="min-h-screen bg-base-200 safe-area-inset">
            {/* Header fijo para móvil */}
            <header className="sticky top-0 z-40 bg-base-100 shadow-sm safe-area-top lg:hidden">
                <div className="navbar min-h-14 px-2">
                    <div className="flex-none">
                        {showBackButton && (
                            <Link to="/settings" className="btn btn-ghost btn-sm gap-1">
                                <ChevronLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">Cancelar</span>
                            </Link>
                        )}
                    </div>
                    <div className="flex-1 text-center">
                        <span className="font-semibold text-sm">Configurar 2FA</span>
                    </div>
                    <div className="flex-none w-16">
                        {/* Spacer para centrar título */}
                    </div>
                </div>

                {/* Progress bar móvil */}
                <div className="h-1 bg-base-200">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${(currentStep / 3) * 100}%` }}
                    />
                </div>
            </header>

            {/* Contenido principal */}
            <div className="flex items-start lg:items-center justify-center min-h-[calc(100vh-60px)] lg:min-h-screen p-2 sm:p-4 py-4 sm:py-8">
                {children}
            </div>

            {/* Safe area bottom */}
            <div className="safe-area-bottom" />
        </main>
    );
}

// ------------------ Steps Indicator ------------------
function StepsIndicator({ current }: { current: 1 | 2 | 3 }) {
    const steps = [
        { num: 1, label: "Escanear", icon: QrCode },
        { num: 2, label: "Códigos", icon: Key },
        { num: 3, label: "Listo", icon: Shield }
    ];

    return (
        <div className="hidden lg:block w-full my-6">
            <ul className="steps steps-horizontal w-full text-xs">
                {steps.map((step) => (
                    <li
                        key={step.num}
                        className={`step ${step.num <= current ? 'step-primary' : ''}`}
                    >
                        <span className="hidden sm:inline">{step.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ------------------ Componente Principal ------------------
export default function MFASetup() {
    const loaderData = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === "submitting";

    switch (loaderData.step) {
        case "scan":
            return (
                <StepScanQR
                    data={loaderData}
                    actionData={actionData}
                    isSubmitting={isSubmitting}
                />
            );
        case "backup":
            return (
                <StepBackupCodes
                    data={loaderData}
                    actionData={actionData}
                    isSubmitting={isSubmitting}
                />
            );
        case "complete":
            return <StepComplete />;
        default:
            return null;
    }
}

// ------------------ Paso 1: Escanear QR ------------------
function StepScanQR({
    data,
    actionData,
    isSubmitting
}: {
    data: LoaderDataStep1;
    actionData: ActionData | undefined;
    isSubmitting: boolean;
}) {
    const [showSecret, setShowSecret] = useState(false);
    const [code, setCode] = useState("");
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleCopySecret = async () => {
        await navigator.clipboard.writeText(data.secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Auto-focus en el input cuando se carga
    useEffect(() => {
        // Delay para permitir animaciones
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <SetupLayout currentStep={1}>
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body p-4 sm:p-6">
                    {/* Header */}
                    <div className="text-center mb-2">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Smartphone className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        </div>
                        <h1 className="card-title justify-center text-xl sm:text-2xl">
                            Configurar 2FA
                        </h1>
                        <p className="text-base-content/60 text-xs sm:text-sm mt-1">
                            Añade una capa extra de seguridad
                        </p>
                    </div>

                    {/* Steps - solo desktop */}
                    <StepsIndicator current={1} />

                    {/* Instrucciones colapsables en móvil */}
                    <div className="collapse collapse-arrow bg-base-200 rounded-lg sm:collapse-open">
                        <input type="checkbox" className="sm:hidden" defaultChecked />
                        <div className="collapse-title font-medium text-sm py-3 min-h-0 flex items-center gap-2">
                            <Info className="w-4 h-4 text-info" />
                            Instrucciones
                        </div>
                        <div className="collapse-content px-4 pb-3">
                            <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-base-content/80">
                                <li>Abre tu app de autenticación</li>
                                <li>Escanea el código QR</li>
                                <li>Ingresa el código de 6 dígitos</li>
                            </ol>
                            <p className="text-xs text-base-content/50 mt-2">
                                Apps compatibles: Google Authenticator, Authy, Microsoft Authenticator
                            </p>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center py-4 sm:py-6">
                        <div className="bg-white p-3 sm:p-4 rounded-xl shadow-lg">
                            <img
                                src={data.qrCode}
                                alt="Código QR para configurar 2FA"
                                className="w-40 h-40 sm:w-48 sm:h-48"
                            />
                        </div>
                    </div>

                    {/* Clave manual */}
                    <div className="text-center">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm gap-2 text-xs sm:text-sm"
                            onClick={() => setShowSecret(!showSecret)}
                        >
                            {showSecret ? (
                                <>
                                    <EyeOff className="w-4 h-4" />
                                    Ocultar clave
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4" />
                                    Ingresar manualmente
                                </>
                            )}
                        </button>

                        {showSecret && (
                            <div className="mt-3 p-3 bg-base-200 rounded-lg animate-in fade-in duration-200">
                                <p className="text-xs text-base-content/60 mb-2">
                                    Clave secreta:
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-base-100 rounded text-xs break-all font-mono select-all border text-left">
                                        {data.secret}
                                    </code>
                                    <button
                                        type="button"
                                        className={`btn btn-sm btn-square shrink-0 ${copied ? 'btn-success' : 'btn-ghost'}`}
                                        onClick={handleCopySecret}
                                    >
                                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="divider text-xs sm:text-sm my-4">Ingresa el código</div>

                    {/* Alert de error */}
                    <Alert
                        type="error"
                        message={actionData && "error" in actionData ? actionData.error : null}
                        dismissible
                        className="mb-2"
                    />

                    {/* Formulario */}
                    <Form method="post" className="space-y-4">
                        <input type="hidden" name="intent" value="verify-code" />

                        <div className="form-control">
                            <div className="join w-full">
                                <input
                                    ref={inputRef}
                                    name="code"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    className="input input-bordered join-item flex-1 text-center text-2xl sm:text-3xl tracking-[0.3em] sm:tracking-[0.5em] font-mono"
                                    placeholder="000000"
                                    required
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <label className="label py-1">
                                <span className="label-text-alt text-base-content/60 text-xs">
                                    El código cambia cada 30 segundos
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full btn-sm sm:btn-md"
                            disabled={isSubmitting || code.length !== 6}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Verificar y Continuar
                                    <ChevronLeft className="w-4 h-4 rotate-180" />
                                </>
                            )}
                        </button>
                    </Form>

                    {/* Botón cancelar - desktop */}
                    <div className="hidden lg:block mt-4">
                        <Link to="/settings" className="btn btn-ghost w-full btn-sm">
                            <ChevronLeft className="w-4 h-4" />
                            Cancelar
                        </Link>
                    </div>
                </div>
            </div>
        </SetupLayout>
    );
}

// ------------------ Paso 2: Códigos de Respaldo ------------------
function StepBackupCodes({
    data,
    actionData,
    isSubmitting
}: {
    data: LoaderDataStep2;
    actionData: ActionData | undefined;
    isSubmitting: boolean;
}) {
    const [confirmed, setConfirmed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const handleCopy = async () => {
        const text = data.backupCodes.join("\n");
        await navigator.clipboard.writeText(text);
        setCopied(true);
    };

    const handleDownload = () => {
        const date = new Date().toLocaleString('es-ES');
        const text = `═══════════════════════════════════════════
       CÓDIGOS DE RESPALDO 2FA
═══════════════════════════════════════════
Generado: ${date}

⚠️  GUARDA ESTOS CÓDIGOS EN UN LUGAR SEGURO
    Cada código solo puede usarse UNA VEZ

───────────────────────────────────────────
${data.backupCodes.map((code, i) => `  ${String(i + 1).padStart(2, '0')}. ${code}`).join("\n")}
───────────────────────────────────────────

Si pierdes acceso a tu app de autenticación,
usa uno de estos códigos para iniciar sesión.

═══════════════════════════════════════════
`;
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `codigos-respaldo-2fa-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloaded(true);
    };

    return (
        <SetupLayout currentStep={2} showBackButton={false}>
            <div className="card w-full max-w-lg bg-base-100 shadow-xl">
                <div className="card-body p-4 sm:p-6">
                    {/* Header */}
                    <div className="text-center mb-2">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Key className="w-7 h-7 sm:w-8 sm:h-8 text-warning" />
                        </div>
                        <h1 className="card-title justify-center text-xl sm:text-2xl">
                            Códigos de Respaldo
                        </h1>
                    </div>

                    {/* Steps - solo desktop */}
                    <StepsIndicator current={2} />

                    {/* Alert importante */}
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 sm:p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-sm text-warning">
                                    ¡Guarda estos códigos ahora!
                                </p>
                                <p className="text-xs text-base-content/70 mt-1">
                                    Son tu única forma de acceder si pierdes tu teléfono.
                                    No podrás verlos de nuevo.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Códigos */}
                    <div className="bg-base-200 rounded-lg p-3 sm:p-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-xs sm:text-sm">Tus 10 códigos:</h3>
                            <span className="badge badge-xs sm:badge-sm badge-primary">Uso único</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 font-mono">
                            {data.backupCodes.map((code, i) => (
                                <div
                                    key={i}
                                    className="bg-base-100 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-center border border-base-300"
                                >
                                    <span className="text-base-content/40 text-xs mr-1">{i + 1}.</span>
                                    <span className="font-bold tracking-wider text-xs sm:text-sm">{code}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`btn btn-sm sm:btn-md gap-1 sm:gap-2 ${copied ? 'btn-success' : 'btn-outline'}`}
                        >
                            {copied ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Copiados</span>
                                    <span className="sm:hidden">✓</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    <span className="hidden sm:inline">Copiar</span>
                                    <span className="sm:hidden">Copiar</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleDownload}
                            className={`btn btn-sm sm:btn-md gap-1 sm:gap-2 ${downloaded ? 'btn-success' : 'btn-outline'}`}
                        >
                            {downloaded ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Descargado</span>
                                    <span className="sm:hidden">✓</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Descargar</span>
                                    <span className="sm:hidden">Bajar</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="bg-info/10 rounded-lg p-3 mt-4">
                        <h4 className="font-medium text-info text-xs sm:text-sm mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Dónde guardarlos
                        </h4>
                        <ul className="text-xs space-y-1 text-base-content/70">
                            <li>• Gestor de contraseñas (1Password, Bitwarden)</li>
                            <li>• Impreso en papel en lugar seguro</li>
                            <li>• Nota segura encriptada</li>
                        </ul>
                    </div>

                    {/* Alert de error */}
                    <Alert
                        type="error"
                        message={actionData && "error" in actionData ? actionData.error : null}
                        dismissible
                        className="mt-4"
                    />

                    {/* Formulario de confirmación */}
                    <Form method="post" className="mt-4 space-y-4">
                        <input type="hidden" name="intent" value="confirm-backup" />
                        <input type="hidden" name="confirmed" value={confirmed ? "true" : "false"} />

                        <label className="flex items-start gap-3 cursor-pointer p-3 sm:p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors border-2 border-transparent has-[:checked]:border-primary">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-sm mt-0.5"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            <span className="text-xs sm:text-sm leading-tight">
                                <strong>Confirmo que guardé mis códigos</strong> y entiendo que no
                                podré verlos de nuevo.
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="btn btn-primary w-full btn-sm sm:btn-md gap-2"
                            disabled={!confirmed || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Activando...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    Activar 2FA
                                </>
                            )}
                        </button>
                    </Form>

                    <p className="text-center text-xs text-base-content/50 mt-2">
                        Se activará la autenticación de dos factores
                    </p>
                </div>
            </div>
        </SetupLayout>
    );
}

// ------------------ Paso 3: Completado ------------------
function StepComplete() {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = "/dashboard";
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <SetupLayout currentStep={3} showBackButton={false}>
            <div className="card w-full max-w-md bg-base-100 shadow-xl">
                <div className="card-body p-4 sm:p-6 text-center">
                    {/* Animación de éxito */}
                    <div className="py-4 sm:py-6">
                        <div className="relative inline-block">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-success" />
                            </div>
                            {/* Confeti visual */}
                            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">🎉</div>
                        </div>
                        <h1 className="card-title justify-center text-xl sm:text-2xl text-success mt-4">
                            ¡2FA Activado!
                        </h1>
                        <p className="text-base-content/60 text-sm mt-2">
                            Tu cuenta ahora está más segura
                        </p>
                    </div>

                    {/* Steps - solo desktop */}
                    <StepsIndicator current={3} />

                    {/* Mensaje de protección */}
                    <div className="bg-success/10 rounded-lg p-4 sm:p-6">
                        <div className="flex items-center justify-center gap-2 text-success mb-3">
                            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="font-bold text-sm sm:text-base">Cuenta protegida</span>
                        </div>
                        <p className="text-xs sm:text-sm text-base-content/70">
                            A partir de ahora necesitarás tu contraseña + código de la app para iniciar sesión.
                        </p>
                    </div>

                    {/* Botón y countdown */}
                    <div className="mt-6 space-y-3">
                        <Link to="/dashboard" className="btn btn-primary w-full btn-sm sm:btn-md">
                            Ir al Dashboard
                        </Link>

                        <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
                            <div className="loading loading-ring loading-xs" />
                            <span>Redirigiendo en {countdown}...</span>
                        </div>
                    </div>

                    {/* Recordatorios */}
                    <div className="bg-base-200 rounded-lg p-3 sm:p-4 mt-6 text-left">
                        <h4 className="font-medium mb-2 text-xs sm:text-sm flex items-center gap-2">
                            <Info className="w-4 h-4 text-info" />
                            Recuerda
                        </h4>
                        <ul className="text-xs text-base-content/70 space-y-1">
                            <li>• Ten siempre acceso a tu app</li>
                            <li>• Guarda tus códigos de respaldo</li>
                            <li>• Puedes desactivar 2FA en Configuración</li>
                        </ul>
                    </div>
                </div>
            </div>
        </SetupLayout>
    );
}