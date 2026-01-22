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
    Send
} from "lucide-react";
import { Breadcrumb } from "~/components/Breadcrumb";
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Formulario de Contacto | Mi App" },
        { name: "description", content: "Formulario con validación de entradas" },
    ];
}

interface FormData {
    nombre: string;
    email: string;
    telefono: string;
    edad: string;
    mensaje: string;
}

interface FormErrors {
    nombre?: string;
    email?: string;
    telefono?: string;
    edad?: string;
    mensaje?: string;
}

export default function Formulario() {
    const [formData, setFormData] = useState<FormData>({
        nombre: "",
        email: "",
        telefono: "",
        edad: "",
        mensaje: "",
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const successRef = useRef<HTMLDivElement>(null);
    const errorRef = useRef<HTMLDivElement>(null);

    // Focus management para accesibilidad
    useEffect(() => {
        if (isSubmitted && successRef.current) {
            successRef.current.focus();
        }
    }, [isSubmitted]);

    const validateField = (name: keyof FormData, value: string): string => {
        switch (name) {
            case "nombre":
                if (!value.trim()) return "El nombre es obligatorio.";
                if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
                if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
                    return "El nombre solo puede contener letras.";
                }
                return "";

            case "email":
                if (!value.trim()) return "El email es obligatorio.";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return "Ingresa un email válido.";
                }
                return "";

            case "telefono":
                if (!value.trim()) return "El teléfono es obligatorio.";
                if (!/^\d{10}$/.test(value.replace(/\s/g, ""))) {
                    return "El teléfono debe tener 10 dígitos.";
                }
                return "";

            case "edad":
                if (!value.trim()) return "La edad es obligatoria.";
                const edad = parseInt(value);
                if (isNaN(edad) || edad < 18 || edad > 120) {
                    return "La edad debe ser un número entre 18 y 120.";
                }
                return "";

            case "mensaje":
                if (!value.trim()) return "El mensaje es obligatorio.";
                if (value.trim().length < 10) {
                    return "El mensaje debe tener al menos 10 caracteres.";
                }
                if (value.length > 500) {
                    return "El mensaje no puede exceder 500 caracteres.";
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
        setFormData((prev) => ({ ...prev, [name]: value }));

        // Validación en tiempo real (on change)
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
            // Enfocar primer error
            const firstErrorField = Object.keys(errors)[0];
            const element = document.getElementById(firstErrorField);
            element?.focus();
            return;
        }

        setIsSubmitting(true);

        // Simular envío (no conectado a BD)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    const handleReset = () => {
        setFormData({
            nombre: "",
            email: "",
            telefono: "",
            edad: "",
            mensaje: "",
        });
        setErrors({});
        setIsSubmitted(false);
    };

    const hasErrors = Object.values(errors).some((error) => error);

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
                                Todos los campos fueron validados correctamente. (No se guardó en BD)
                            </p>

                            <div className="bg-base-200 rounded-lg p-4 w-full text-left">
                                <h2 className="font-semibold mb-2">Datos ingresados:</h2>
                                <ul className="space-y-1 text-sm">
                                    <li><strong>Nombre:</strong> {formData.nombre}</li>
                                    <li><strong>Email:</strong> {formData.email}</li>
                                    <li><strong>Teléfono:</strong> {formData.telefono}</li>
                                    <li><strong>Edad:</strong> {formData.edad} años</li>
                                    <li><strong>Mensaje:</strong> {formData.mensaje}</li>
                                </ul>
                            </div>

                            <div className="card-actions mt-4 w-full">
                                <button
                                    onClick={handleReset}
                                    className="btn btn-primary w-full"
                                >
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
                            <div
                                ref={errorRef}
                                role="alert"
                                className="alert alert-warning mb-4"
                            >
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
                                </label>
                                <input
                                    id="nombre"
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`input input-bordered w-full ${errors.nombre ? "input-error" : ""
                                        }`}
                                    placeholder="Juan Pérez"
                                    aria-required="true"
                                    aria-invalid={!!errors.nombre}
                                    aria-describedby={errors.nombre ? "nombre-error" : undefined}
                                />
                                {errors.nombre && (
                                    <label className="label" id="nombre-error">
                                        <span className="label-text-alt text-error">
                                            {errors.nombre}
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
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`input input-bordered w-full ${errors.email ? "input-error" : ""
                                        }`}
                                    placeholder="juan@ejemplo.com"
                                    aria-required="true"
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                />
                                {errors.email && (
                                    <label className="label" id="email-error">
                                        <span className="label-text-alt text-error">
                                            {errors.email}
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Teléfono */}
                            <div className="form-control">
                                <label className="label" htmlFor="telefono">
                                    <span className="label-text font-medium flex items-center gap-2">
                                        <Phone className="w-4 h-4" aria-hidden="true" />
                                        Teléfono (10 dígitos)
                                        <span className="text-error" aria-hidden="true">*</span>
                                    </span>
                                </label>
                                <input
                                    id="telefono"
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`input input-bordered w-full ${errors.telefono ? "input-error" : ""
                                        }`}
                                    placeholder="5512345678"
                                    inputMode="numeric"
                                    aria-required="true"
                                    aria-invalid={!!errors.telefono}
                                    aria-describedby={errors.telefono ? "telefono-error" : undefined}
                                />
                                {errors.telefono && (
                                    <label className="label" id="telefono-error">
                                        <span className="label-text-alt text-error">
                                            {errors.telefono}
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Edad */}
                            <div className="form-control">
                                <label className="label" htmlFor="edad">
                                    <span className="label-text font-medium">
                                        Edad
                                        <span className="text-error ml-1" aria-hidden="true">*</span>
                                    </span>
                                </label>
                                <input
                                    id="edad"
                                    type="number"
                                    name="edad"
                                    value={formData.edad}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    min="18"
                                    max="120"
                                    className={`input input-bordered w-full ${errors.edad ? "input-error" : ""
                                        }`}
                                    placeholder="25"
                                    aria-required="true"
                                    aria-invalid={!!errors.edad}
                                    aria-describedby={errors.edad ? "edad-error" : undefined}
                                />
                                {errors.edad && (
                                    <label className="label" id="edad-error">
                                        <span className="label-text-alt text-error">
                                            {errors.edad}
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
                                </label>
                                <textarea
                                    id="mensaje"
                                    name="mensaje"
                                    value={formData.mensaje}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`textarea textarea-bordered w-full h-24 ${errors.mensaje ? "textarea-error" : ""
                                        }`}
                                    placeholder="Escribe tu mensaje aquí (mínimo 10 caracteres)..."
                                    aria-required="true"
                                    aria-invalid={!!errors.mensaje}
                                    aria-describedby={errors.mensaje ? "mensaje-error" : "mensaje-hint"}
                                />
                                <label className="label">
                                    {errors.mensaje ? (
                                        <span id="mensaje-error" className="label-text-alt text-error">
                                            {errors.mensaje}
                                        </span>
                                    ) : (
                                        <span id="mensaje-hint" className="label-text-alt">
                                            {formData.mensaje.length}/500 caracteres
                                        </span>
                                    )}
                                </label>
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