// app/components/Navbar.tsx
import { Link, Form } from "react-router";
import {
    LogIn,
    UserPlus,
    Settings,
    LogOut,
    LayoutDashboard,
    FastForward,
    Menu
} from "lucide-react";

interface NavbarUser {
    id: number;
    email: string;
    fullName: string;
    mfaEnabled: boolean;
}

interface NavbarProps {
    user: NavbarUser | null;
    currentPath?: string;
}

export function Navbar({ user, currentPath = "/" }: NavbarProps) {
    return (
        <div className="navbar bg-base-100 shadow-lg rounded-box mb-6">
            {/* Logo / Marca */}
            <div className="flex-1">
                <Link to="/" className="btn btn-ghost text-xl gap-2">
                    <FastForward className="w-6 h-6 text-primary" />
                    <span className="font-bold">Remix App</span>
                </Link>
            </div>

            {/* Menú Desktop */}
            <div className="flex-none hidden md:flex">
                {user ? (
                    <AuthenticatedMenu user={user} />
                ) : (
                    <GuestMenu />
                )}
            </div>

            {/* Menú Mobile */}
            <div className="flex-none md:hidden">
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                        <Menu className="w-5 h-5" />
                    </div>
                    <ul
                        tabIndex={0}
                        className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
                    >
                        {user ? (
                            <MobileAuthenticatedMenu user={user} />
                        ) : (
                            <MobileGuestMenu />
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// Menús para usuarios NO autenticados

function GuestMenu() {
    return (
        <div className="flex items-center gap-2">
            <Link to="/auth/login" className="btn btn-primary gap-2">
                <LogIn className="w-4 h-4" />
                Iniciar Sesión
            </Link>
            <Link to="/auth/register" className="btn btn-secondary gap-2">
                <UserPlus className="w-4 h-4" />
                Registrarse
            </Link>
        </div>
    );
}

function MobileGuestMenu() {
    return (
        <>
            <li>
                <Link to="/auth/login" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    Iniciar Sesión
                </Link>
            </li>
            <li>
                <Link to="/auth/register" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Registrarse
                </Link>
            </li>
        </>
    );
}

// Menús para usuarios autenticados

function AuthenticatedMenu({ user }: { user: NavbarUser }) {
    return (
        <div className="flex items-center gap-2">
            {/* Dropdown de Usuario */}
            <div className="dropdown dropdown-end">
                <div
                    tabIndex={0}
                    role="button"
                    className="btn btn-ghost gap-2"
                >
                    <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <span className="hidden lg:inline">{user.fullName.split(' ')[0]}</span>
                    {user.mfaEnabled && (
                        <div className="badge badge-success badge-xs" title="2FA Activo">
                            <FastForward className="w-2 h-2" />
                        </div>
                    )}
                </div>
                <ul
                    tabIndex={0}
                    className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-56"
                >
                    {/* Info del usuario */}
                    <li className="menu-title px-4 py-2">
                        <div className="flex flex-col">
                            <span className="font-semibold">{user.fullName}</span>
                            <span className="text-xs opacity-60 font-normal">{user.email}</span>
                        </div>
                    </li>

                    <div className="divider my-0"></div>

                    <li>
                        <Link to="/dashboard" className="gap-2">
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>
                    </li>
                    <li>
                        <Link to="/settings" className="gap-2">
                            <Settings className="w-4 h-4" />
                            Configuración
                        </Link>
                    </li>

                    <div className="divider my-0"></div>

                    <li>
                        <Form action="/auth/logout" method="post">
                            <button type="submit" className="w-full flex items-center gap-2 text-error">
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </Form>
                    </li>
                </ul>
            </div>
        </div>
    );
}

function MobileAuthenticatedMenu({ user }: { user: NavbarUser }) {
    return (
        <>
            {/* Info del usuario */}
            <li className="menu-title">
                <div className="flex items-center gap-2">
                    <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center text-sm">
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold">{user.fullName}</span>
                        <span className="text-xs opacity-60">{user.email}</span>
                    </div>
                </div>
            </li>

            <div className="divider my-1"></div>

            <li>
                <Link to="/dashboard" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                </Link>
            </li>
            <li>
                <Link to="/settings" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Configuración
                </Link>
            </li>

            <div className="divider my-1"></div>

            <li>
                <Form action="/auth/logout" method="post" className="p-0">
                    <button type="submit" className="w-full flex items-center gap-2 text-error px-4 py-2">
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </Form>
            </li>
        </>
    );
}