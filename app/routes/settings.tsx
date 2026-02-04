// app/routes/settings.tsx
import { Form, Link, useLoaderData, useActionData, useNavigation, data } from "react-router";
import { useState, useEffect, useRef } from "react";
import {
    User,
    Shield,
    Key,
    Mail,
    CheckCircle,
    ShieldCheck,
    ShieldOff,
    LogOut,
    KeyRound,
    Eye,
    EyeOff,
    RefreshCw,
    Copy,
    Download,
    Lock,
    Unlock,
    Clock,
    Menu,
    X,
    ChevronLeft,
    Smartphone,
    Monitor,
    Tablet
} from "lucide-react";
import type { Route } from "./+types/settings";
import { requireAuth } from "~/utils/auth.guard";
import {
    getUserById,
    hashPassword,
    verifyPassword,
    revokeAllUserTokens,
    getBackupCodesStats,
    regenerateBackupCodes,
    type BackupCodesStats
} from "~/utils/auth.server";
import { execute, query } from "~/utils/db.server";
import { validateFormData, passwordResetSchema } from "~/utils/validation.server";
import { logSecurityEvent } from "~/services/security.server";
import { getSession, commitSession } from "~/utils/sessions.server";
import { Alert } from "~/components/Alert";

export function meta() {
    return [
        { title: "Configuración | Mi App" },
        { name: "description", content: "Configura tu cuenta" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    const { user } = await requireAuth(request);
    const session = await getSession(request.headers.get("Cookie"));

    let currentIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");

    if (currentIp && currentIp.includes(',')) {
        currentIp = currentIp.split(',')[0].trim();
    }

    if (!currentIp) {
        currentIp = "127.0.0.1";
    }

    const sessions = await query<{
        id: number;
        device_info: string;
        ip_address: string;
        created_at: Date;
    }>(
        `SELECT id, device_info, ip_address, created_at 
         FROM refresh_tokens 
         WHERE user_id = ? AND revoked = FALSE AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [user.id]
    );

    const backupCodesStats = await getBackupCodesStats(user.id);
    const backupPasswordVerified = session.get("backup_password_verified") === true;
    const newlyGeneratedCodes = session.get("newly_generated_codes") as string[] | undefined;

    const responseData = {
        user,
        sessions,
        currentIp,
        backupCodesStats,
        backupPasswordVerified,
        newlyGeneratedCodes: newlyGeneratedCodes || null
    };

    if (newlyGeneratedCodes) {
        session.unset("newly_generated_codes");

        return data(responseData, {
            headers: {
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    return responseData;
}

export async function action({ request }: Route.ActionArgs) {
    const { user } = await requireAuth(request);
    const formData = await request.formData();
    const intent = formData.get("intent") as string;
    const session = await getSession(request.headers.get("Cookie"));

    if (intent === "change-password") {
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("password") as string;

        const dbUser = await getUserById(user.id);
        if (!dbUser) {
            return { intent, error: "Usuario no encontrado" };
        }

        const isValid = await verifyPassword(currentPassword, dbUser.password_hash);
        if (!isValid) {
            return { intent, error: "Contraseña actual incorrecta" };
        }

        const validation = validateFormData(passwordResetSchema, formData);
        if (!validation.success) {
            return { intent, errors: validation.errors };
        }

        const hashedPassword = await hashPassword(newPassword);
        await execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            [hashedPassword, user.id]
        );

        await revokeAllUserTokens(user.id);
        await logSecurityEvent('password_change', user.id, request);

        return { intent, success: "Contraseña actualizada correctamente" };
    }

    if (intent === "logout-all") {
        await revokeAllUserTokens(user.id);
        await logSecurityEvent('logout', user.id, request, { type: 'all_sessions' });

        session.unset("accessToken");
        session.unset("refreshToken");

        return new Response(null, {
            status: 302,
            headers: {
                Location: "/auth/login?loggedout=all",
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    if (intent === "logout-session") {
        const sessionId = formData.get("sessionId") as string;
        await execute(
            "UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE id = ? AND user_id = ?",
            [sessionId, user.id]
        );
        return { intent, success: "Sesión cerrada" };
    }

    if (intent === "verify-backup-password") {
        const password = formData.get("password") as string;

        if (!password) {
            return { intent, error: "La contraseña es requerida" };
        }

        const dbUser = await getUserById(user.id);
        if (!dbUser) {
            return { intent, error: "Usuario no encontrado" };
        }

        const isValid = await verifyPassword(password, dbUser.password_hash);
        if (!isValid) {
            await logSecurityEvent('login_failed', user.id, request, {
                context: 'backup_codes_view'
            });
            return { intent, error: "Contraseña incorrecta" };
        }

        session.set("backup_password_verified", true);
        session.set("backup_password_verified_at", Date.now());

        return new Response(null, {
            status: 302,
            headers: {
                Location: "/settings?tab=backup-codes",
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    if (intent === "regenerate-backup-codes") {
        const password = formData.get("password") as string;

        if (!password) {
            return { intent, error: "La contraseña es requerida para regenerar códigos" };
        }

        const dbUser = await getUserById(user.id);
        if (!dbUser) {
            return { intent, error: "Usuario no encontrado" };
        }

        const isValid = await verifyPassword(password, dbUser.password_hash);
        if (!isValid) {
            await logSecurityEvent('login_failed', user.id, request, {
                context: 'backup_codes_regenerate'
            });
            return { intent, error: "Contraseña incorrecta" };
        }

        const newCodes = await regenerateBackupCodes(user.id);

        await logSecurityEvent('mfa_enabled', user.id, request, {
            action: 'backup_codes_regenerated'
        });

        session.set("newly_generated_codes", newCodes);
        session.set("backup_password_verified", true);

        return new Response(null, {
            status: 302,
            headers: {
                Location: "/settings?tab=backup-codes&regenerated=true",
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    if (intent === "lock-backup-codes") {
        session.unset("backup_password_verified");
        session.unset("backup_password_verified_at");
        session.unset("newly_generated_codes");

        return new Response(null, {
            status: 302,
            headers: {
                Location: "/settings?tab=backup-codes",
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    if (intent === "confirm-codes-saved") {
        session.unset("newly_generated_codes");

        return new Response(null, {
            status: 302,
            headers: {
                Location: "/settings?tab=backup-codes",
                "Set-Cookie": await commitSession(session)
            }
        });
    }

    return null;
}

type TabType = 'profile' | 'security' | 'sessions' | 'backup-codes';

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
    condition?: boolean;
}

export default function SettingsPage() {
    const {
        user,
        sessions,
        currentIp,
        backupCodesStats,
        backupPasswordVerified,
        newlyGeneratedCodes
    } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const isSubmitting = navigation.state === 'submitting';

    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    // Definir tabs con configuración
    const tabs: TabConfig[] = [
        { id: 'profile', label: 'Perfil', icon: <User className="w-4 h-4" /> },
        { id: 'security', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> },
        { id: 'sessions', label: 'Sesiones', icon: <Key className="w-4 h-4" /> },
        {
            id: 'backup-codes',
            label: 'Códigos',
            icon: <KeyRound className="w-4 h-4" />,
            condition: user.mfaEnabled,
            badge: backupCodesStats.remaining <= 3 && backupCodesStats.remaining > 0 ? (
                <span className="badge badge-warning badge-xs ml-1">{backupCodesStats.remaining}</span>
            ) : backupCodesStats.remaining === 0 ? (
                <span className="badge badge-error badge-xs ml-1">!</span>
            ) : null
        }
    ];

    const visibleTabs = tabs.filter(tab => tab.condition === undefined || tab.condition);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') as TabType;
        if (tab && visibleTabs.some(t => t.id === tab)) {
            setActiveTab(tab);
        }
    }, []);

    // Scroll horizontal en tabs para móvil
    useEffect(() => {
        if (tabsContainerRef.current) {
            const activeTabElement = tabsContainerRef.current.querySelector(`[data-tab="${activeTab}"]`);
            if (activeTabElement) {
                activeTabElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [activeTab]);

    // Cerrar menú móvil al cambiar de tab
    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    return (
        <main className="min-h-screen bg-base-200 safe-area-inset">
            {/* Header responsivo */}
            <header className="sticky top-0 z-40 bg-base-100 shadow-sm safe-area-top">
                <div className="navbar container mx-auto max-w-6xl px-2 sm:px-4">
                    <div className="flex-none">
                        <Link 
                            to="/dashboard" 
                            className="btn btn-ghost btn-sm sm:btn-md gap-1 sm:gap-2"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Volver</span>
                        </Link>
                    </div>
                    <div className="flex-1 px-2">
                        <h1 className="text-lg sm:text-xl font-bold truncate">Configuración</h1>
                    </div>
                    
                    {/* Menú hamburguesa para móvil */}
                    <div className="flex-none lg:hidden">
                        <button 
                            className="btn btn-ghost btn-square"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Menú"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Tabs horizontales deslizables - visible en tablet y móvil */}
                <div className="lg:hidden border-t border-base-200">
                    <div 
                        ref={tabsContainerRef}
                        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                data-tab={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-3 whitespace-nowrap snap-center
                                    border-b-2 transition-colors min-w-max
                                    ${activeTab === tab.id 
                                        ? 'border-primary text-primary font-medium' 
                                        : 'border-transparent text-base-content/60 hover:text-base-content'
                                    }
                                `}
                            >
                                {tab.icon}
                                <span className="text-sm">{tab.label}</span>
                                {tab.badge}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Overlay del menú móvil */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Drawer del menú móvil */}
            <aside className={`
                fixed top-0 right-0 h-full w-64 bg-base-100 shadow-xl z-40
                transform transition-transform duration-300 ease-in-out lg:hidden
                ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-4 border-b border-base-200 flex items-center justify-between">
                    <h2 className="font-bold">Menú</h2>
                    <button 
                        className="btn btn-ghost btn-sm btn-square"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <nav className="p-2">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                                transition-colors
                                ${activeTab === tab.id 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'hover:bg-base-200'
                                }
                            `}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.badge}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Contenido principal */}
            <div className="container mx-auto max-w-6xl p-2 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                    {/* Sidebar - solo visible en desktop */}
                    <aside className="hidden lg:block lg:col-span-1">
                        <div className="sticky top-20">
                            <ul className="menu bg-base-100 rounded-box shadow w-full">
                                {visibleTabs.map(tab => (
                                    <li key={tab.id}>
                                        <button
                                            onClick={() => handleTabChange(tab.id)}
                                            className={activeTab === tab.id ? 'active' : ''}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                            {tab.badge}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>

                    {/* Contenido del tab activo */}
                    <div className="lg:col-span-3">
                        {activeTab === 'profile' && (
                            <ProfileTab user={user} />
                        )}

                        {activeTab === 'security' && (
                            <SecurityTab
                                user={user}
                                actionData={actionData}
                                isSubmitting={isSubmitting}
                            />
                        )}

                        {activeTab === 'sessions' && (
                            <SessionsTab sessions={sessions} currentIp={currentIp} />
                        )}

                        {activeTab === 'backup-codes' && user.mfaEnabled && (
                            <BackupCodesTab
                                stats={backupCodesStats}
                                isVerified={backupPasswordVerified}
                                newCodes={newlyGeneratedCodes}
                                actionData={actionData}
                                isSubmitting={isSubmitting}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Safe area bottom para dispositivos con home indicator */}
            <div className="safe-area-bottom" />
        </main>
    );
}

function ProfileTab({ user }: { user: any }) {
    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 sm:p-6">
                <h2 className="card-title flex items-center gap-2 text-base sm:text-lg">
                    <User className="w-5 h-5" />
                    Información del Perfil
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium text-sm">Nombre</span>
                        </label>
                        <input
                            type="text"
                            value={user.fullName}
                            className="input input-bordered input-sm sm:input-md"
                            disabled
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium text-sm">Email</span>
                        </label>
                        <input
                            type="email"
                            value={user.email}
                            className="input input-bordered input-sm sm:input-md"
                            disabled
                        />
                    </div>
                </div>

                <Alert
                    type="info"
                    message="Para cambiar tu email o nombre, contacta a soporte."
                    dismissible={false}
                    className="mt-4"
                />
            </div>
        </div>
    );
}

function SecurityTab({
    user,
    actionData,
    isSubmitting
}: {
    user: any;
    actionData: any;
    isSubmitting: boolean;
}) {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* 2FA Card */}
            <div className="card bg-base-100 shadow">
                <div className="card-body p-4 sm:p-6">
                    <h2 className="card-title flex items-center gap-2 text-base sm:text-lg">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="hidden sm:inline">Autenticación de Dos Factores (2FA)</span>
                        <span className="sm:hidden">2FA</span>
                    </h2>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                        <div>
                            <p className="font-medium text-sm sm:text-base">
                                Estado: {' '}
                                <span className={user.mfaEnabled ? 'text-success' : 'text-warning'}>
                                    {user.mfaEnabled ? 'Activado' : 'Desactivado'}
                                </span>
                            </p>
                            <p className="text-xs sm:text-sm text-base-content/60">
                                {user.mfaEnabled
                                    ? 'Tu cuenta está protegida con 2FA'
                                    : 'Añade una capa extra de seguridad'
                                }
                            </p>
                        </div>

                        {user.mfaEnabled ? (
                            <Link 
                                to="/auth/mfa/disable" 
                                className="btn btn-outline btn-error btn-sm sm:btn-md gap-2 w-full sm:w-auto"
                            >
                                <ShieldOff className="w-4 h-4" />
                                Desactivar
                            </Link>
                        ) : (
                            <Link 
                                to="/auth/mfa/setup" 
                                className="btn btn-primary btn-sm sm:btn-md gap-2 w-full sm:w-auto"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Activar 2FA
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Password Change Card */}
            <div className="card bg-base-100 shadow">
                <div className="card-body p-4 sm:p-6">
                    <h2 className="card-title flex items-center gap-2 text-base sm:text-lg">
                        <Key className="w-5 h-5" />
                        Cambiar Contraseña
                    </h2>

                    <Alert
                        type="success"
                        message={actionData?.intent === 'change-password' && actionData?.success ? actionData.success : null}
                        dismissible
                        autoClose={5000}
                    />

                    <Alert
                        type="error"
                        message={actionData?.intent === 'change-password' && actionData?.error ? actionData.error : null}
                        dismissible
                    />

                    <Form method="post" className="space-y-4 mt-4">
                        <input type="hidden" name="intent" value="change-password" />

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">Contraseña Actual</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="currentPassword"
                                    type={showCurrentPassword ? "text" : "password"}
                                    className="input input-bordered input-sm sm:input-md w-full pr-12"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs sm:btn-sm btn-circle"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">Nueva Contraseña</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showNewPassword ? "text" : "password"}
                                    className="input input-bordered input-sm sm:input-md w-full pr-12"
                                    required
                                    autoComplete="new-password"
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs sm:btn-sm btn-circle"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {actionData?.errors?.password && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-xs">
                                        {actionData.errors.password}
                                    </span>
                                </label>
                            )}
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">Confirmar Nueva Contraseña</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="input input-bordered input-sm sm:input-md w-full pr-12"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs sm:btn-sm btn-circle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {actionData?.errors?.confirmPassword && (
                                <label className="label">
                                    <span className="label-text-alt text-error text-xs">
                                        {actionData.errors.confirmPassword}
                                    </span>
                                </label>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto"
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                'Cambiar Contraseña'
                            )}
                        </button>
                    </Form>
                </div>
            </div>
        </div>
    );
}

function SessionsTab({ sessions, currentIp }: { sessions: any[], currentIp: string }) {
    // Detectar tipo de dispositivo basado en device_info
    const getDeviceIcon = (deviceInfo: string) => {
        const info = deviceInfo?.toLowerCase() || '';
        if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
            return <Smartphone className="w-5 h-5" />;
        }
        if (info.includes('tablet') || info.includes('ipad')) {
            return <Tablet className="w-5 h-5" />;
        }
        return <Monitor className="w-5 h-5" />;
    };

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="card-title flex items-center gap-2 text-base sm:text-lg">
                        <Key className="w-5 h-5" />
                        Sesiones Activas
                    </h2>

                    <Form method="post">
                        <input type="hidden" name="intent" value="logout-all" />
                        <button
                            type="submit"
                            className="btn btn-outline btn-error btn-sm gap-2 w-full sm:w-auto"
                        >
                            <LogOut className="w-4 h-4" />
                            Cerrar Todas
                        </button>
                    </Form>
                </div>

                {/* Vista de tabla para pantallas grandes */}
                <div className="hidden md:block overflow-x-auto mt-4">
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>Dispositivo</th>
                                <th>IP</th>
                                <th>Fecha (UTC)</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session, index) => {
                                const isCurrent = session.ip_address === currentIp || index === 0;

                                return (
                                    <tr key={session.id} className={isCurrent ? "bg-base-200/50" : ""}>
                                        <td className="flex items-center gap-2">
                                            {getDeviceIcon(session.device_info)}
                                            <span>{session.device_info || 'Desconocido'}</span>
                                            {isCurrent && (
                                                <span className="badge badge-success badge-sm">
                                                    Actual
                                                </span>
                                            )}
                                        </td>
                                        <td className="font-mono text-xs">{session.ip_address || 'N/A'}</td>
                                        <td className="text-xs">
                                            {new Date(session.created_at).toLocaleString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'UTC'
                                            })}
                                        </td>
                                        <td>
                                            {!isCurrent && (
                                                <Form method="post">
                                                    <input type="hidden" name="intent" value="logout-session" />
                                                    <input type="hidden" name="sessionId" value={session.id} />
                                                    <button
                                                        type="submit"
                                                        className="btn btn-ghost btn-xs text-error"
                                                    >
                                                        Cerrar
                                                    </button>
                                                </Form>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Vista de cards para móvil */}
                <div className="md:hidden space-y-3 mt-4">
                    {sessions.map((session, index) => {
                        const isCurrent = session.ip_address === currentIp || index === 0;

                        return (
                            <div 
                                key={session.id} 
                                className={`
                                    p-4 rounded-lg border
                                    ${isCurrent ? 'bg-base-200/50 border-primary/30' : 'border-base-200'}
                                `}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-base-200 rounded-lg">
                                            {getDeviceIcon(session.device_info)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm">
                                                    {session.device_info || 'Desconocido'}
                                                </span>
                                                {isCurrent && (
                                                    <span className="badge badge-success badge-xs">
                                                        Actual
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-base-content/60 font-mono mt-1">
                                                {session.ip_address || 'N/A'}
                                            </p>
                                            <p className="text-xs text-base-content/60 mt-1">
                                                {new Date(session.created_at).toLocaleString('es-ES', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {!isCurrent && (
                                        <Form method="post">
                                            <input type="hidden" name="intent" value="logout-session" />
                                            <input type="hidden" name="sessionId" value={session.id} />
                                            <button
                                                type="submit"
                                                className="btn btn-ghost btn-sm text-error"
                                            >
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                        </Form>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {sessions.length === 0 && (
                    <p className="text-center text-base-content/60 py-8">
                        No hay sesiones activas
                    </p>
                )}
            </div>
        </div>
    );
}

function BackupCodesTab({
    stats,
    isVerified,
    newCodes,
    actionData,
    isSubmitting
}: {
    stats: BackupCodesStats;
    isVerified: boolean;
    newCodes: string[] | null;
    actionData: any;
    isSubmitting: boolean;
}) {
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    useEffect(() => {
        if (newCodes && newCodes.length > 0) {
            setShowRegenerateModal(false);
        }
    }, [newCodes]);

    useEffect(() => {
        if (!isVerified) {
            setShowRegenerateModal(false);
        }
    }, [isVerified]);

    useEffect(() => {
        setCopied(false);
        setDownloaded(false);
    }, [newCodes]);

    if (newCodes && newCodes.length > 0) {
        return (
            <NewCodesDisplay
                codes={newCodes}
                copied={copied}
                setCopied={setCopied}
                downloaded={downloaded}
                setDownloaded={setDownloaded}
            />
        );
    }

    if (!isVerified) {
        return (
            <PasswordVerificationForm
                actionData={actionData}
                isSubmitting={isSubmitting}
                stats={stats}
            />
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header Card */}
            <div className="card bg-base-100 shadow">
                <div className="card-body p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="card-title flex items-center gap-2 text-base sm:text-lg">
                            <KeyRound className="w-5 h-5" />
                            Códigos de Respaldo
                        </h2>
                        <Form method="post">
                            <input type="hidden" name="intent" value="lock-backup-codes" />
                            <button type="submit" className="btn btn-ghost btn-sm gap-2 w-full sm:w-auto">
                                <Lock className="w-4 h-4" />
                                Bloquear vista
                            </button>
                        </Form>
                    </div>

                    <p className="text-base-content/60 text-xs sm:text-sm mt-2">
                        Los códigos de respaldo te permiten acceder a tu cuenta si pierdes acceso
                        a tu aplicación de autenticación.
                    </p>
                </div>
            </div>

            {/* Stats Card */}
            <div className="card bg-base-100 shadow">
                <div className="card-body p-4 sm:p-6">
                    <h3 className="font-bold mb-4 text-sm sm:text-base">Estado de tus códigos</h3>

                    <div className="stats stats-vertical sm:stats-horizontal shadow w-full">
                        <div className="stat p-3 sm:p-4">
                            <div className="stat-figure text-success">
                                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                            <div className="stat-title text-xs sm:text-sm">Disponibles</div>
                            <div className="stat-value text-success text-2xl sm:text-3xl">{stats.remaining}</div>
                            <div className="stat-desc text-xs">códigos sin usar</div>
                        </div>

                        <div className="stat p-3 sm:p-4">
                            <div className="stat-figure text-base-content/40">
                                <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                            </div>
                            <div className="stat-title text-xs sm:text-sm">Usados</div>
                            <div className="stat-value text-2xl sm:text-3xl">{stats.used}</div>
                            <div className="stat-desc text-xs">de {stats.total} códigos</div>
                        </div>
                    </div>

                    <Alert
                        type="warning"
                        message={stats.remaining <= 3 && stats.remaining > 0
                            ? "Te quedan pocos códigos de respaldo. Considera regenerar nuevos códigos."
                            : null
                        }
                        dismissible={false}
                        className="mt-4"
                    />

                    <Alert
                        type="error"
                        message={stats.remaining === 0
                            ? "¡No tienes códigos de respaldo disponibles! Regenera nuevos códigos para mantener acceso a tu cuenta."
                            : null
                        }
                        dismissible={false}
                        className="mt-4"
                    />
                </div>
            </div>

            {/* History Card - Responsive Table */}
            {stats.used > 0 && (
                <div className="card bg-base-100 shadow">
                    <div className="card-body p-4 sm:p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <Clock className="w-5 h-5" />
                            Historial de uso
                        </h3>

                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Código #</th>
                                        <th>Estado</th>
                                        <th>Fecha de uso (UTC)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.codes.map((code, index) => (
                                        <tr key={code.id} className={code.used ? 'opacity-60' : ''}>
                                            <td>
                                                <span className="font-mono text-xs">
                                                    Código {index + 1}
                                                </span>
                                            </td>
                                            <td>
                                                {code.used ? (
                                                    <span className="badge badge-ghost badge-sm">Usado</span>
                                                ) : (
                                                    <span className="badge badge-success badge-sm">Disponible</span>
                                                )}
                                            </td>
                                            <td className="text-xs">
                                                {code.used && code.used_at ? (
                                                    new Date(code.used_at).toLocaleDateString('es-ES', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        timeZone: 'UTC'
                                                    })
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List */}
                        <div className="sm:hidden space-y-2">
                            {stats.codes.map((code, index) => (
                                <div 
                                    key={code.id} 
                                    className={`
                                        flex items-center justify-between p-3 rounded-lg border border-base-200
                                        ${code.used ? 'opacity-60 bg-base-200/30' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs bg-base-200 px-2 py-1 rounded">
                                            #{index + 1}
                                        </span>
                                        {code.used ? (
                                            <span className="badge badge-ghost badge-xs">Usado</span>
                                        ) : (
                                            <span className="badge badge-success badge-xs">Disponible</span>
                                        )}
                                    </div>
                                    {code.used && code.used_at && (
                                        <span className="text-xs text-base-content/60">
                                            {new Date(code.used_at).toLocaleDateString('es-ES', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-base-content/50 mt-2">
                            Los códigos están encriptados y no pueden mostrarse después de generados.
                        </p>
                    </div>
                </div>
            )}

            {/* Regenerate Card */}
            <div className="card bg-base-100 shadow">
                <div className="card-body p-4 sm:p-6">
                    <h3 className="font-bold mb-2 text-sm sm:text-base">Regenerar códigos</h3>
                    <p className="text-xs sm:text-sm text-base-content/60 mb-4">
                        Al regenerar códigos, los códigos actuales serán invalidados y recibirás
                        10 códigos nuevos. <strong>Solo podrás ver los códigos una vez.</strong>
                    </p>

                    <button
                        onClick={() => setShowRegenerateModal(true)}
                        className="btn btn-outline btn-primary btn-sm sm:btn-md gap-2 w-full sm:w-auto"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Regenerar códigos de respaldo
                    </button>
                </div>
            </div>

            {showRegenerateModal && (
                <RegenerateModal
                    onClose={() => setShowRegenerateModal(false)}
                    actionData={actionData}
                    isSubmitting={isSubmitting}
                />
            )}
        </div>
    );
}

function PasswordVerificationForm({
    actionData,
    isSubmitting,
    stats
}: {
    actionData: any;
    isSubmitting: boolean;
    stats: BackupCodesStats;
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="card bg-base-100 shadow max-w-md mx-auto">
            <div className="card-body p-4 sm:p-6">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-base-content/60" />
                    </div>
                    <h2 className="card-title justify-center text-base sm:text-lg">
                        Códigos de Respaldo
                    </h2>
                    <p className="text-base-content/60 text-xs sm:text-sm mt-2">
                        Ingresa tu contraseña para ver y gestionar tus códigos
                    </p>
                </div>

                <div className="bg-base-200 rounded-lg p-3 sm:p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm">Códigos disponibles:</span>
                        <span className={`font-bold ${stats.remaining <= 3 ? 'text-warning' : 'text-success'}`}>
                            {stats.remaining} de {stats.total}
                        </span>
                    </div>
                </div>

                <Alert
                    type="error"
                    message={actionData?.intent === 'verify-backup-password' && actionData?.error
                        ? actionData.error
                        : null
                    }
                    dismissible
                    className="mb-4"
                />

                <Form method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="verify-backup-password" />

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-sm">Contraseña</span>
                        </label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                className="input input-bordered input-sm sm:input-md w-full pr-12"
                                placeholder="Ingresa tu contraseña"
                                required
                                autoComplete="current-password"
                                autoFocus
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs sm:btn-sm btn-circle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary btn-sm sm:btn-md w-full gap-2"
                    >
                        {isSubmitting ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : (
                            <>
                                <Unlock className="w-4 h-4" />
                                Ver códigos de respaldo
                            </>
                        )}
                    </button>
                </Form>

                <p className="text-xs text-center text-base-content/50 mt-4">
                    Esta verificación es requerida por seguridad
                </p>
            </div>
        </div>
    );
}

function RegenerateModal({
    onClose,
    actionData,
    isSubmitting
}: {
    onClose: () => void;
    actionData: any;
    isSubmitting: boolean;
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="modal modal-open modal-bottom sm:modal-middle">
            <div className="modal-box w-full sm:max-w-md">
                <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Regenerar códigos de respaldo
                </h3>

                <Alert
                    type="warning"
                    message="Esta acción invalidará todos tus códigos actuales. Asegúrate de guardar los nuevos códigos."
                    dismissible={false}
                    className="my-4"
                />

                <Alert
                    type="error"
                    message={actionData?.intent === 'regenerate-backup-codes' && actionData?.error
                        ? actionData.error
                        : null
                    }
                    dismissible
                    className="mb-4"
                />

                <Form method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="regenerate-backup-codes" />

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-sm">Confirma tu contraseña</span>
                        </label>
                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                className="input input-bordered input-sm sm:input-md w-full pr-12"
                                placeholder="Ingresa tu contraseña"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs sm:btn-sm btn-circle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="modal-action flex-col sm:flex-row gap-2 sm:gap-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost btn-sm sm:btn-md w-full sm:w-auto order-2 sm:order-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary btn-sm sm:btn-md gap-2 w-full sm:w-auto order-1 sm:order-2"
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerar códigos
                                </>
                            )}
                        </button>
                    </div>
                </Form>
            </div>
            <div className="modal-backdrop" onClick={onClose}>
                <button className="cursor-default">close</button>
            </div>
        </div>
    );
}

function NewCodesDisplay({
    codes,
    copied,
    setCopied,
    downloaded,
    setDownloaded
}: {
    codes: string[];
    copied: boolean;
    setCopied: (v: boolean) => void;
    downloaded: boolean;
    setDownloaded: (v: boolean) => void;
}) {
    const handleCopy = async () => {
        const text = codes.join("\n");
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
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
${codes.map((code, i) => `  ${String(i + 1).padStart(2, '0')}. ${code}`).join("\n")}
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
        <div className="card bg-base-100 shadow max-w-lg mx-auto">
            <div className="card-body p-4 sm:p-6">
                <div className="text-center mb-4">
                    <div className="text-3xl sm:text-4xl mb-2">🔑</div>
                    <h2 className="card-title justify-center text-lg sm:text-2xl">
                        Nuevos Códigos de Respaldo
                    </h2>
                </div>

                <Alert
                    type="warning"
                    message="¡Guarda estos códigos ahora! Esta es la única vez que podrás verlos."
                    dismissible={false}
                />

                <div className="bg-base-200 rounded-lg p-3 sm:p-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-xs sm:text-sm">Tus 10 códigos de respaldo:</h3>
                        <span className="badge badge-xs sm:badge-sm badge-primary">Uso único</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm">
                        {codes.map((code, i) => (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={`btn btn-sm sm:btn-md gap-2 ${copied ? 'btn-success' : 'btn-outline'}`}
                    >
                        {copied ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Copiados
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                Copiar todos
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        className={`btn btn-sm sm:btn-md gap-2 ${downloaded ? 'btn-success' : 'btn-outline'}`}
                    >
                        {downloaded ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Descargado
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Descargar .txt
                            </>
                        )}
                    </button>
                </div>

                <div className="bg-info/10 rounded-lg p-3 mt-4">
                    <h4 className="font-medium text-info text-xs sm:text-sm mb-2">💡 Dónde guardarlos:</h4>
                    <ul className="text-xs space-y-1 text-base-content/70">
                        <li>• En un gestor de contraseñas</li>
                        <li>• Impreso en papel en un lugar seguro</li>
                        <li>• En una nota segura encriptada</li>
                    </ul>
                </div>

                <Form method="post" className="mt-6">
                    <input type="hidden" name="intent" value="confirm-codes-saved" />
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm sm:btn-md w-full"
                    >
                        He guardado mis códigos, continuar
                    </button>
                </Form>

                <p className="text-center text-xs text-base-content/50 mt-2">
                    Al continuar, no podrás ver estos códigos de nuevo.
                </p>
            </div>
        </div>
    );
}