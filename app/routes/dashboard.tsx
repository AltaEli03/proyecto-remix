// app/routes/dashboard.tsx
import { Link, useLoaderData, Form } from "react-router";
import { useState } from "react";
import {
    Settings,
    LogOut,
    Shield,
    ShieldCheck,
    ChevronDown,
    Menu,
    X,
    User,
    Bell,
    CheckCircle2
} from "lucide-react";
import type { Route } from "./+types/dashboard";
import { requireAuth } from "~/utils/auth.guard";

export function meta() {
    return [
        { title: "Dashboard | Mi App" },
        { name: "description", content: "Tu panel de control" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }
    ];
}

export async function loader({ request }: Route.LoaderArgs) {
    const { user } = await requireAuth(request);
    return { user };
}

export default function Dashboard() {
    const { user } = useLoaderData<typeof loader>();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    return (
        <main className="min-h-screen bg-base-200 safe-area-inset">
            {/* Main Content */}
            <div className="container mx-auto max-w-6xl px-2 sm:px-4 py-4 sm:py-6">
                {/* Welcome Card */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold">
                                    ¡Bienvenido, {user.fullName.split(' ')[0]}!
                                </h1>
                                <p className="text-sm text-base-content/60 mt-1">
                                    Aquí tienes un resumen de tu cuenta
                                </p>
                            </div>
                            <Link
                                to="/settings"
                                className="btn btn-outline btn-sm sm:btn-md gap-2 w-full sm:w-auto"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="hidden sm:inline">Configurar cuenta</span>
                                <span className="sm:hidden">Configurar</span>
                            </Link>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            {/* Account Status Card */}
                            <div className="stat bg-base-200/50 rounded-box p-4">
                                <div className="stat-figure text-success">
                                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
                                </div>
                                <div className="stat-title text-xs sm:text-sm">Estado de la cuenta</div>
                                <div className="stat-value text-success text-xl sm:text-2xl">Verificada</div>
                                <div className="stat-desc text-xs">Tu cuenta está activa</div>
                            </div>

                            {/* 2FA Status Card */}
                            <div className="stat bg-base-200/50 rounded-box p-4">
                                <div className={`stat-figure ${user.mfaEnabled ? 'text-success' : 'text-warning'}`}>
                                    {user.mfaEnabled ? (
                                        <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10" />
                                    ) : (
                                        <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
                                    )}
                                </div>
                                <div className="stat-title text-xs sm:text-sm">Autenticación 2FA</div>
                                <div className={`stat-value text-xl sm:text-2xl ${user.mfaEnabled ? 'text-success' : 'text-warning'}`}>
                                    {user.mfaEnabled ? 'Activado' : 'Desactivado'}
                                </div>
                                {!user.mfaEnabled && (
                                    <div className="stat-desc">
                                        <Link to="/auth/mfa/setup" className="link link-primary text-xs">
                                            Activar ahora →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2FA Warning Alert */}
                        {!user.mfaEnabled && (
                            <div className="alert alert-warning mt-6 flex-col sm:flex-row items-start sm:items-center gap-3">
                                <Shield className="w-5 h-5 shrink-0" />
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm">Mejora la seguridad de tu cuenta</h3>
                                    <p className="text-xs mt-1">
                                        Activa la autenticación de dos factores para proteger tu cuenta.
                                    </p>
                                </div>
                                <Link
                                    to="/auth/mfa/setup"
                                    className="btn btn-sm w-full sm:w-auto"
                                >
                                    Configurar 2FA
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions - Mobile optimized grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
                    <Link
                        to="/settings?tab=profile"
                        className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                    >
                        <div className="card-body items-center text-center p-4">
                            <User className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                            <span className="text-xs sm:text-sm font-medium mt-2">Mi Perfil</span>
                        </div>
                    </Link>

                    <Link
                        to="/settings?tab=security"
                        className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                    >
                        <div className="card-body items-center text-center p-4">
                            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                            <span className="text-xs sm:text-sm font-medium mt-2">Seguridad</span>
                        </div>
                    </Link>

                    <Link
                        to="/settings?tab=sessions"
                        className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                    >
                        <div className="card-body items-center text-center p-4">
                            <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                            <span className="text-xs sm:text-sm font-medium mt-2">Sesiones</span>
                        </div>
                    </Link>

                    {user.mfaEnabled && (
                        <Link
                            to="/settings?tab=backup-codes"
                            className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
                        >
                            <div className="card-body items-center text-center p-4">
                                <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                <span className="text-xs sm:text-sm font-medium mt-2">Códigos</span>
                            </div>
                        </Link>
                    )}
                </div>
            </div>

            {/* Safe area bottom for devices with home indicator */}
            <div className="safe-area-bottom" />
        </main>
    );
}