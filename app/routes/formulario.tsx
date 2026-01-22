// app/routes/formulario.tsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import {
    FileText,
    User,
    Mail,
    Phone,
    MessageSquare,
    CheckCircle,
    AlertCircle,
    Send,
    Calendar
} from "lucide-react";
import { Breadcrumb } from "~/components/Breadcrumb";
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Formulario de Contacto | Mi App" },
        { name: "description", content: "Formulario con validación de entradas" },
    ];
}

// Constantes para límites de longitud
const FIELD_LIMITS = {
    nombre: { min: 2, max: 50 },
    email: { min: 5, max: 100 },
    telefono: { min: 10, max: 10 },
    mensaje: { min: 10, max: 500 },
} as const;

// Constantes para edad
const AGE_LIMITS = {
    min: 18,
    max: 120,
} as const;

interface FormData {
    nombre: string;
    email: string;
    telefono: string;
    fechaNacimiento: string;
    mensaje: string;
}

interface FormErrors {
    nombre?: string;
    email?: string;
    telefono?: string;
    fechaNacimiento?: string;
    mensaje?: string;
}

// Función para calcular la edad a partir de la fecha de nacimiento
const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
};

// Función para obtener la fecha máxima (hace 18 años)
const getMaxDate = (): string => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - AGE_LIMITS.min);
    return date.toISOString().split('T')[0];
};

// Función para obtener la fecha mínima (hace 120 años)
const getMinDate = (): string => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - AGE_LIMITS.max);
    return date.toISOString().split('T')[0];
};

// Función para formatear la fecha en español
const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

export default function Formulario() {
    const [formData, setFormData] = useState<FormData>({
        nombre: "",
        email: "",
        telefono: "",
        fechaNacimiento: "",
        mensaje: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const successRef = useRef<HTMLDivElement>(null);
    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSubmitted && successRef.current) {
            successRef.current.focus();
        }
    }, [isSubmitted]);

    const validateField = (name: keyof FormData, value: string): string => {
        switch (name) {
            case "nombre":
                if (!value.trim()) return "El nombre es obligatorio.";
                if (value.trim().length < FIELD_LIMITS.nombre.min) {
                    return `El nombre debe tener al menos ${FIELD_LIMITS.nombre.min} caracteres.`;
                }
                if (value.trim().length > FIELD_LIMITS.nombre.max) {
                    return `El nombre no puede exceder ${FIELD_LIMITS.nombre.max} caracteres.`;
                }
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
                    return "El nombre solo puede contener letras.";
                }
                return "";

            case "email":
                if (!value.trim()) return "El email es obligatorio.";
                if (value.length > FIELD_LIMITS.email.max) {
                    return `El email no puede exceder ${FIELD_LIMITS.email.max} caracteres.`;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return "Ingresa un email válido.";
                }
                return "";

            case "telefono":
                if (!value.trim()) return "El teléfono es obligatorio.";
                if (!/^\d{10}$/.test(value.replace(/\s/g, ""))) {
                    return "El teléfono debe tener exactamente 10 dígitos.";
                }
                return "";

            case "fechaNacimiento":
                if (!value.trim()) return "La fecha de nacimiento es obligatoria.";
                
                const selectedDate = new Date(value);
                const today = new Date();
                
                // Verificar que la fecha no sea futura
                if (selectedDate > today) {
                    return "La fecha de nacimiento no puede ser en el futuro.";
                }
                
                const age = calculateAge(value);
                
                if (age < AGE_LIMITS.min) {
                    return `Debes tener al menos ${AGE_LIMITS.min} años.`;
                }
                if (age > AGE_LIMITS.max) {
                    return `La edad no puede ser mayor a ${AGE_LIMITS.max} años.`;
                }
                return "";

            case "mensaje":
                if (!value.trim()) return "El mensaje es obligatorio.";
                if (value.trim().length < FIELD_LIMITS.mensaje.min) {
                    return `El mensaje debe tener al menos ${FIELD_LIMITS.mensaje.min} caracteres.`;
                }
                if (value.length > FIELD_LIMITS.mensaje.max) {
                    return `El mensaje no puede exceder ${FIELD_LIMITS.mensaje.max} caracteres.`;
                }
                return "";

            default:
                return "";
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        // Para teléfono, solo permitir dígitos
        if (name === "telefono") {
            const numericValue = value.replace(/\D/g, "");
            setFormData((prev) => ({ ...prev, [name]: numericValue }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }

        if (errors[name as keyof FormErrors]) {
            const error = validateField(name as keyof FormData, value);
            setErrors((prev) => ({ ...prev, [name]: error }));
        }
    };

    const handleBlur = (
        e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        const error = validateField(name as keyof FormData, value);
        setErrors((prev) => ({ ...prev, [name]: error }));
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        (Object.keys(formData) as Array<keyof FormData>).forEach((field) => {
            const error = validateField(field, formData[field]);
            if (error) {
                newErrors[field] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            const firstErrorField = Object.keys(errors)[0];
            const element = document.getElementById(firstErrorField);
            element?.focus();
            return;
        }

        setIsSubmitting(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    const handleReset = () => {
        setFormData({
            nombre: "",
            email: "",
            telefono: "",
            fechaNacimiento: "",
            mensaje: "",
        });
        setErrors({});
        setIsSubmitted(false);
    };

    // Helper para calcular el porcentaje de uso
    const getCharacterProgress = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage >= 90) return "text-error";
        if (percentage >= 70) return "text-warning";
        return "text-base-content/50";
    };

    const hasErrors = Object.values(errors).some((error) => error);

    // Calcular la edad actual si hay fecha seleccionada
    const currentAge = formData.fechaNacimiento ? calculateAge(formData.fechaNacimiento) : null;

    if (isSubmitted) {
        return (
            <main className="min-h-screen bg-base-200 p-4">
                <div className="container mx-auto max-w-lg">
                    <Breadcrumb items={[{ label: "Formulario" }]} />

                    <div
                        ref={successRef}
                        tabIndex={-1}
                        className="card bg-base-100 shadow-xl"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="card-body items-center text-center">
                            <div className="avatar placeholder mb-4">
                                <div className="bg-success text-success-content rounded-full w-20 h-20 flex items-center justify-center">
                                    <CheckCircle className="w-10 h-10" aria-hidden="true" />
                                </div>
                            </div>

                            <h1 className="card-title text-2xl text-success">
                                ¡Formulario Validado!
                            </h1>

                            <p className="text-base-content/70 mb-4">
                                Todos los campos fueron validados correctamente.
                            </p>

                            <div className="bg-base-200 rounded-lg p-4 w-full text-left">
                                <h2 className="font-semibold mb-2">Datos ingresados:</h2>
                                <ul className="space-y-1 text-sm">
                                    <li><strong>Nombre:</strong> {formData.nombre}</li>
                                    <li><strong>Email:</strong> {formData.email}</li>
                                    <li><strong>Teléfono:</strong> {formData.telefono}</li>
                                    <li>
                                        <strong>Fecha de nacimiento:</strong> {formatDate(formData.fechaNacimiento)}
                                        <span className="text-base-content/60 ml-1">
                                            ({calculateAge(formData.fechaNacimiento)} años)
                                        </span>
                                    </li>
                                    <li><strong>Mensaje:</strong> {formData.mensaje}</li>
                                </ul>
                            </div>

                            <div className="card-actions mt-4 w-full">
                                <button onClick={handleReset} className="btn btn-primary w-full">
                                    Enviar otro formulario
                                </button>
                                <Link to="/" className="btn btn-ghost w-full">
                                    ← Volver al Inicio
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-base-200 p-4">
            <div className="container mx-auto max-w-lg">
                <Breadcrumb items={[{ label: "Formulario" }]} />

                <section aria-labelledby="form-title" className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="avatar placeholder">
                                <div className="bg-secondary text-secondary-content rounded-full w-12 h-12 flex items-center justify-center">
                                    <FileText className="w-6 h-6" aria-hidden="true" />
                                </div>
                            </div>
                            <div>
                                <h1 id="form-title" className="card-title text-2xl">
                                    Formulario de Contacto
                                </h1>
                                <p className="text-base-content/60 text-sm">
                                    Todos los campos son obligatorios
                                </p>
                            </div>
                        </div>

                        {/* Error Summary */}
                        {hasErrors && (
                            <div ref={errorRef} role="alert" className="alert alert-warning mb-4">
                                <AlertCircle className="w-5 h-5" aria-hidden="true" />
                                <span>Por favor, corrige los errores marcados.</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            {/* Nombre */}
                            <div className="form-control">
                                <label className="label" htmlFor="nombre">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <User className="w-4 h-4" aria-hidden="true" />
                                        Nombre completo
                                        <span className="text-error" aria-hidden="true">*</span>
                                    </span>
                                    <span className={`label-text-alt ${getCharacterProgress(formData.nombre.length, FIELD_LIMITS.nombre.max)}`}>
                                        {formData.nombre.length}/{FIELD_LIMITS.nombre.max}
                                    </span>
                                </label>
                                <input
                                    id="nombre"
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength={FIELD_LIMITS.nombre.max}
                                    className={`input input-bordered w-full ${errors.nombre ? "input-error" : ""}`}
                                    placeholder="Juan Pérez"
                                    aria-required="true"
                                    aria-invalid={!!errors.nombre}
                                    aria-describedby={errors.nombre ? "nombre-error" : "nombre-hint"}
                                />
                                {errors.nombre ? (
                                    <label className="label" id="nombre-error">
                                        <span className="label-text-alt text-error">{errors.nombre}</span>
                                    </label>
                                ) : (
                                    <label className="label" id="nombre-hint">
                                        <span className="label-text-alt text-base-content/50">
                                            Entre {FIELD_LIMITS.nombre.min} y {FIELD_LIMITS.nombre.max} caracteres
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Email */}
                            <div className="form-control">
                                <label className="label" htmlFor="email">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <Mail className="w-4 h-4" aria-hidden="true" />
                                        Correo electrónico
                                        <span className="text-error" aria-hidden="true">*</span>
                                    </span>
                                    <span className={`label-text-alt ${getCharacterProgress(formData.email.length, FIELD_LIMITS.email.max)}`}>
                                        {formData.email.length}/{FIELD_LIMITS.email.max}
                                    </span>
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength={FIELD_LIMITS.email.max}
                                    className={`input input-bordered w-full ${errors.email ? "input-error" : ""}`}
                                    placeholder="juan@ejemplo.com"
                                    aria-required="true"
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? "email-error" : "email-hint"}
                                />
                                {errors.email ? (
                                    <label className="label" id="email-error">
                                        <span className="label-text-alt text-error">{errors.email}</span>
                                    </label>
                                ) : (
                                    <label className="label" id="email-hint">
                                        <span className="label-text-alt text-base-content/50">
                                            Máximo {FIELD_LIMITS.email.max} caracteres
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Teléfono */}
                            <div className="form-control">
                                <label className="label" htmlFor="telefono">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <Phone className="w-4 h-4" aria-hidden="true" />
                                        Teléfono
                                        <span className="text-error" aria-hidden="true">*</span>
                                    </span>
                                    <span className={`label-text-alt ${getCharacterProgress(formData.telefono.length, FIELD_LIMITS.telefono.max)}`}>
                                        {formData.telefono.length}/{FIELD_LIMITS.telefono.max}
                                    </span>
                                </label>
                                <input
                                    id="telefono"
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength={FIELD_LIMITS.telefono.max}
                                    className={`input input-bordered w-full ${errors.telefono ? "input-error" : ""}`}
                                    placeholder="5512345678"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    aria-required="true"
                                    aria-invalid={!!errors.telefono}
                                    aria-describedby={errors.telefono ? "telefono-error" : "telefono-hint"}
                                />
                                {errors.telefono ? (
                                    <label className="label" id="telefono-error">
                                        <span className="label-text-alt text-error">{errors.telefono}</span>
                                    </label>
                                ) : (
                                    <label className="label" id="telefono-hint">
                                        <span className="label-text-alt text-base-content/50">
                                            Exactamente 10 dígitos
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Fecha de Nacimiento */}
                            <div className="form-control">
                                <label className="label" htmlFor="fechaNacimiento">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <Calendar className="w-4 h-4" aria-hidden="true" />
                                        Fecha de nacimiento
                                        <span className="text-error" aria-hidden="true">*</span>
                                    </span>
                                    {currentAge !== null && currentAge >= AGE_LIMITS.min && currentAge <= AGE_LIMITS.max && (
                                        <span className="label-text-alt text-success font-medium">
                                            {currentAge} años
                                        </span>
                                    )}
                                </label>
                                <input
                                    id="fechaNacimiento"
                                    type="date"
                                    name="fechaNacimiento"
                                    value={formData.fechaNacimiento}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    min={getMinDate()}
                                    max={getMaxDate()}
                                    className={`input input-bordered w-full ${errors.fechaNacimiento ? "input-error" : ""}`}
                                    aria-required="true"
                                    aria-invalid={!!errors.fechaNacimiento}
                                    aria-describedby={errors.fechaNacimiento ? "fechaNacimiento-error" : "fechaNacimiento-hint"}
                                />
                                {errors.fechaNacimiento ? (
                                    <label className="label" id="fechaNacimiento-error">
                                        <span className="label-text-alt text-error">{errors.fechaNacimiento}</span>
                                    </label>
                                ) : (
                                    <label className="label" id="fechaNacimiento-hint">
                                        <span className="label-text-alt text-base-content/50">
                                            Debes tener entre {AGE_LIMITS.min} y {AGE_LIMITS.max} años
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Mensaje */}
                            <div className="form-control">
                                <label className="label" htmlFor="mensaje">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" aria-hidden="true" />
                                        Mensaje
                                        <span className="text-error" aria-hidden="true">*</span>
                                    </span>
                                    <span className={`label-text-alt ${getCharacterProgress(formData.mensaje.length, FIELD_LIMITS.mensaje.max)}`}>
                                        {formData.mensaje.length}/{FIELD_LIMITS.mensaje.max}
                                    </span>
                                </label>
                                <textarea
                                    id="mensaje"
                                    name="mensaje"
                                    value={formData.mensaje}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    maxLength={FIELD_LIMITS.mensaje.max}
                                    className={`textarea textarea-bordered w-full h-24 ${errors.mensaje ? "textarea-error" : ""}`}
                                    placeholder="Escribe tu mensaje aquí..."
                                    aria-required="true"
                                    aria-invalid={!!errors.mensaje}
                                    aria-describedby={errors.mensaje ? "mensaje-error" : "mensaje-hint"}
                                />
                                {errors.mensaje ? (
                                    <label className="label" id="mensaje-error">
                                        <span className="label-text-alt text-error">{errors.mensaje}</span>
                                    </label>
                                ) : (
                                    <label className="label" id="mensaje-hint">
                                        <span className="label-text-alt text-base-content/50">
                                            Entre {FIELD_LIMITS.mensaje.min} y {FIELD_LIMITS.mensaje.max} caracteres
                                        </span>
                                    </label>
                                )}

                                {/* Barra de progreso visual para el mensaje */}
                                <progress
                                    className={`progress w-full h-1 ${formData.mensaje.length >= FIELD_LIMITS.mensaje.max * 0.9
                                            ? "progress-error"
                                            : formData.mensaje.length >= FIELD_LIMITS.mensaje.max * 0.7
                                                ? "progress-warning"
                                                : "progress-primary"
                                        }`}
                                    value={formData.mensaje.length}
                                    max={FIELD_LIMITS.mensaje.max}
                                    aria-hidden="true"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-primary w-full gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner w-4 h-4" aria-hidden="true" />
                                        Validando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" aria-hidden="true" />
                                        Enviar Formulario
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="divider">Navegación</div>

                        <Link to="/" className="btn btn-ghost">
                            ← Volver al Inicio
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}