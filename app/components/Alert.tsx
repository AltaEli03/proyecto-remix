// app/components/Alert.tsx
import { useState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Info, X, type LucideIcon } from "lucide-react";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertProps {
    type: AlertType;
    message: string | null | undefined;
    icon?: LucideIcon;
    dismissible?: boolean;
    autoClose?: number;
    onClose?: () => void;
    className?: string;
}

const alertConfig = {
    success: { class: "alert-success", Icon: CheckCircle },
    error: { class: "alert-error", Icon: AlertCircle },
    warning: { class: "alert-warning", Icon: AlertTriangle },
    info: { class: "alert-info", Icon: Info },
};

export function Alert({
    type,
    message,
    icon,
    dismissible = true,
    autoClose = 0,
    onClose,
    className = "",
}: AlertProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [animationKey, setAnimationKey] = useState(0); // Para reiniciar animación
    const alertRef = useRef<HTMLDivElement>(null);

    // Animar entrada cuando hay mensaje
    useEffect(() => {
        if (message) {
            setIsLeaving(false);
            setAnimationKey(prev => prev + 1); // Reiniciar animación
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
        }
    }, [message]);

    // Auto-cerrar
    useEffect(() => {
        if (autoClose > 0 && message && isVisible) {
            const timer = setTimeout(() => {
                handleClose();
            }, autoClose);
            return () => clearTimeout(timer);
        }
    }, [autoClose, message, isVisible]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsLeaving(false);
            onClose?.();
        }, 200);
    };

    if (!message || (!isVisible && !isLeaving)) return null;

    const { class: alertClass, Icon: DefaultIcon } = alertConfig[type];
    const Icon = icon || DefaultIcon;

    return (
        <div
            ref={alertRef}
            role="alert"
            tabIndex={-1}
            className={`
                alert ${alertClass} ${className}
                relative overflow-hidden
                transition-all duration-200 ease-out
                ${isLeaving
                    ? "opacity-0 translate-y-[-10px] scale-95"
                    : "opacity-100 translate-y-0 scale-100"
                }
                focus:ring-2 focus:ring-offset-2 focus:outline-none
            `}
        >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{message}</span>

            {dismissible && (
                <button
                    type="button"
                    onClick={handleClose}
                    className="btn btn-ghost btn-xs btn-circle hover:bg-black/10"
                    aria-label="Cerrar alerta"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {/* Barra de progreso para auto-close */}
            {autoClose > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                    <div
                        key={animationKey}
                        className="h-full bg-black/30"
                        style={{
                            animation: `shrink ${autoClose}ms linear forwards`,
                        }}
                    />
                </div>
            )}

            {/* Estilos para la animación */}
            <style>{`
                @keyframes shrink {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    );
}