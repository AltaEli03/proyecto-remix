// app/routes/galeria.tsx
import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation, useRevalidator } from "react-router";
import { useRef, useState, useEffect, useCallback } from "react";
import {
    Upload,
    Image as ImageIcon,
    AlertCircle,
    CheckCircle,
    Trash2,
    X,
    ZoomIn,
    Download,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";
import { Breadcrumb } from "~/components/Breadcrumb";
import { Alert } from "~/components/Alert";
import {
    uploadImageToCloudinary,
    getImagesFromCloudinary,
    deleteImageFromCloudinary
} from "~/utils/cloudinary.server";
import type { Route } from "./+types/galeria";

// --- CONSTANTES ---
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Tipos para las imágenes de Cloudinary
interface CloudinaryImage {
    public_id: string;
    secure_url: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
    created_at: string;
}

// Tipo para el modal de confirmación de eliminación
interface DeleteConfirmation {
    publicId: string;
    imageUrl?: string;
}

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Galería de Imágenes | Mi App" },
        { name: "description", content: "Sube y gestiona tus imágenes con Cloudinary" },
    ];
}

// --- LOADER: Obtener imágenes existentes ---
export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const images = await getImagesFromCloudinary();
        return data({ images, error: null });
    } catch (error) {
        console.error("Error al cargar imágenes:", error);
        return data({ images: [], error: "No se pudieron cargar las imágenes" });
    }
}

// --- ACTION: Subir o eliminar imágenes ---
export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent");

    // Eliminar imagen
    if (intent === "delete") {
        const publicId = formData.get("publicId");
        if (!publicId || typeof publicId !== "string") {
            return data(
                { success: false, error: "ID de imagen no válido", message: null },
                { status: 400 }
            );
        }

        try {
            await deleteImageFromCloudinary(publicId);
            return data({
                success: true,
                message: "Imagen eliminada correctamente",
                error: null
            });
        } catch (error) {
            console.error("Error al eliminar:", error);
            return data(
                { success: false, error: "No se pudo eliminar la imagen", message: null },
                { status: 500 }
            );
        }
    }

    // Subir imagen
    const file = formData.get("image");

    if (!file || !(file instanceof File) || file.size === 0) {
        return data(
            { success: false, error: "No se seleccionó ninguna imagen", message: null },
            { status: 400 }
        );
    }

    if (!file.type.startsWith("image/")) {
        return data(
            { success: false, error: "El archivo debe ser una imagen", message: null },
            { status: 400 }
        );
    }

    // Validación de respaldo en el servidor (Seguridad)
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return data(
            { success: false, error: `La imagen supera el límite de ${MAX_FILE_SIZE_MB}MB`, message: null },
            { status: 400 }
        );
    }

    try {
        await uploadImageToCloudinary(file);
        return data({
            success: true,
            message: "¡Imagen subida correctamente!",
            error: null,
        });
    } catch (error) {
        console.error("Error al subir:", error);
        return data(
            { success: false, error: "Error al subir la imagen a Cloudinary", message: null },
            { status: 500 }
        );
    }
}

// --- COMPONENTE PRINCIPAL ---
export default function Galeria() {
    const { images, error: loaderError } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const revalidator = useRevalidator();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const deleteFormRef = useRef<HTMLFormElement>(null);

    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [modalImage, setModalImage] = useState<{ url: string; publicId: string } | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Estado para el modal de confirmación de eliminación
    const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);

    // NUEVO: Estado para errores del cliente (validación inmediata)
    const [clientError, setClientError] = useState<string | null>(null);

    const isSubmitting = navigation.state === "submitting";
    const isLoading = navigation.state === "loading" || revalidator.state === "loading";
    const isDeleting = isSubmitting && navigation.formData?.get("intent") === "delete";

    // Limpiar preview después de subida exitosa
    useEffect(() => {
        if (actionData?.success && actionData?.message?.includes("subida")) {
            clearPreview();
        }
    }, [actionData]);

    // Cerrar modal de confirmación después de eliminar exitosamente
    useEffect(() => {
        if (actionData?.success && actionData?.message?.includes("eliminada")) {
            setDeleteConfirmation(null);
            setModalImage(null);
        }
    }, [actionData]);

    // NUEVO: Función centralizada de validación
    const validateAndSetFile = useCallback((file: File) => {
        setClientError(null); // Limpiar errores previos

        // 1. Validar Tipo
        if (!file.type.startsWith("image/")) {
            setClientError("El archivo seleccionado no es una imagen válida.");
            // Limpiar selección previa si había
            setSelectedFile(null);
            setPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return false;
        }

        // 2. Validar Tamaño
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setClientError(`La imagen es demasiado grande. Máximo permitido: ${MAX_FILE_SIZE_MB} MB.`);
            // Aún así mostramos la preview para que el usuario vea qué archivo seleccionó
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            return false;
        }

        // Si pasa todas las validaciones
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        return true;
    }, []);

    // Manejar cambio de archivo (Input)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            validateAndSetFile(file);
        }
    };

    // Manejar drag & drop
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            const isValid = validateAndSetFile(file);

            // Solo sincronizar input file si es válido
            if (isValid) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                if (fileInputRef.current) {
                    fileInputRef.current.files = dataTransfer.files;
                }
            }
        }
    }, [validateAndSetFile]);

    // Limpiar selección
    const clearPreview = () => {
        setPreview(null);
        setSelectedFile(null);
        setClientError(null); // Limpiar error al cancelar
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Abrir modal de confirmación de eliminación
    const openDeleteConfirmation = (publicId: string, imageUrl?: string) => {
        setDeleteConfirmation({ publicId, imageUrl });
    };

    // Cerrar modal de confirmación
    const closeDeleteConfirmation = () => {
        setDeleteConfirmation(null);
    };

    // Confirmar eliminación
    const confirmDelete = () => {
        if (deleteFormRef.current) {
            deleteFormRef.current.requestSubmit();
        }
    };

    // Formatear tamaño de archivo
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    // Verificar si el archivo excede el tamaño
    const isFileTooLarge = selectedFile && selectedFile.size > MAX_FILE_SIZE_BYTES;

    return (
        <main className="min-h-screen bg-base-200 p-4">
            <div className="container mx-auto max-w-6xl">
                <Breadcrumb items={[{ label: "Galería" }]} />

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* ===== PANEL DE SUBIDA ===== */}
                    <section className="lg:col-span-1">
                        <div className="card bg-base-100 shadow-xl sticky top-4">
                            <div className="card-body">
                                <h1 className="card-title text-2xl flex items-center gap-2">
                                    <Upload className="w-6 h-6 text-primary" aria-hidden="true" />
                                    Subir Imagen
                                </h1>

                                <p className="text-base-content/70 text-sm">
                                    Arrastra o selecciona una imagen (Máx {MAX_FILE_SIZE_MB}MB).
                                </p>

                                {/* Mensajes de Error (Cliente o Servidor) */}
                                {(clientError || actionData?.error) && (
                                    <Alert
                                        type="error"
                                        message={clientError || actionData?.error}
                                        dismissible={true}
                                        onClose ={() => setClientError(null)}
                                        className="mt-2"
                                    />
                                )}

                                {/* Mensaje de Éxito */}
                                {actionData?.success && !clientError && (
                                    <Alert
                                        type="success"
                                        message={actionData?.message}
                                        dismissible={true}
                                        autoClose={4000}
                                        className="mt-2"
                                    />
                                )}

                                <Form method="post" encType="multipart/form-data" className="space-y-4 mt-4">
                                    {/* Zona de Drop */}
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        className={`
                                            relative border-2 border-dashed rounded-xl p-6 text-center 
                                            transition-all duration-200 cursor-pointer
                                            ${dragActive
                                                ? "border-primary bg-primary/10 scale-[1.02]"
                                                : clientError || isFileTooLarge
                                                    ? "border-error bg-error/5"
                                                    : "border-base-300 hover:border-primary/50 hover:bg-base-200/50"
                                            }
                                        `}
                                    >
                                        {!preview ? (
                                            <div className="space-y-3">
                                                <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center
                                                    ${clientError ? "bg-error/10" : "bg-primary/10"}`}
                                                >
                                                    {clientError ? (
                                                        <AlertCircle className="w-7 h-7 text-error" aria-hidden="true" />
                                                    ) : (
                                                        <ImageIcon className="w-7 h-7 text-primary" aria-hidden="true" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-base-content">
                                                        Arrastra tu imagen aquí
                                                    </p>
                                                    <p className="text-sm text-base-content/60">
                                                        o haz clic para seleccionar
                                                    </p>
                                                </div>
                                                <p className="text-xs text-base-content/50">
                                                    PNG, JPG, GIF, WebP (máx. {MAX_FILE_SIZE_MB}MB)
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="relative inline-block">
                                                    <img
                                                        src={preview}
                                                        alt="Vista previa de la imagen seleccionada"
                                                        className={`max-h-48 rounded-lg shadow-md mx-auto object-contain
                                                            ${isFileTooLarge ? "ring-2 ring-error ring-offset-2" : ""}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            clearPreview();
                                                        }}
                                                        className="absolute -top-2 -right-2 btn btn-circle btn-error btn-xs shadow-lg z-10"
                                                        aria-label="Eliminar imagen seleccionada"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {selectedFile && (
                                                    <div className="text-xs text-base-content/70 space-y-0.5">
                                                        <p className="font-medium truncate max-w-[200px] mx-auto">
                                                            {selectedFile.name}
                                                        </p>
                                                        <p className={`${isFileTooLarge ? "text-error font-bold" : ""}`}>
                                                            {formatFileSize(selectedFile.size)}
                                                            {isFileTooLarge && (
                                                                <span className="ml-1">
                                                                    (excede {MAX_FILE_SIZE_MB}MB)
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            name="image"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            aria-label="Seleccionar imagen para subir"
                                        />
                                    </div>

                                    {/* Botón de Subir */}
                                    <button
                                        type="submit"
                                        // Deshabilitar si hay error de cliente, no hay archivo, o se está enviando
                                        disabled={!selectedFile || !!clientError || isFileTooLarge || isSubmitting}
                                        className="btn btn-primary w-full gap-2"
                                        aria-disabled={!selectedFile || !!clientError || isFileTooLarge || isSubmitting}
                                    >
                                        {isSubmitting && !isDeleting ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
                                                Subiendo...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" aria-hidden="true" />
                                                Subir Imagen
                                            </>
                                        )}
                                    </button>
                                </Form>

                                {/* Info adicional */}
                                <div className="divider text-xs text-base-content/50">Información</div>
                                <ul className="text-xs text-base-content/60 space-y-1">
                                    <li>• Las imágenes se almacenan en Cloudinary</li>
                                    <li>• Formatos soportados: JPG, PNG, GIF, WebP</li>
                                    <li>• Tamaño máximo: {MAX_FILE_SIZE_MB}MB por imagen</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* ===== GALERÍA DE IMÁGENES ===== */}
                    <section className="lg:col-span-2" aria-labelledby="gallery-title">
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                    <h2 id="gallery-title" className="card-title text-2xl flex items-center gap-2">
                                        <ImageIcon className="w-6 h-6 text-secondary" aria-hidden="true" />
                                        Galería
                                        <span className="badge badge-secondary badge-lg">
                                            {images.length}
                                        </span>
                                    </h2>

                                    <button
                                        onClick={() => revalidator.revalidate()}
                                        disabled={isLoading}
                                        className="btn btn-ghost btn-sm gap-2"
                                        aria-label="Recargar galería"
                                    >
                                        <RefreshCw
                                            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                                            aria-hidden="true"
                                        />
                                        Actualizar
                                    </button>
                                </div>

                                {/* Error del loader */}
                                {loaderError && (
                                    <Alert
                                        type="warning"
                                        message={loaderError}
                                        dismissible={true}
                                        className="mb-4"
                                    />
                                )}

                                {/* Estado vacío */}
                                {images.length === 0 && !loaderError ? (
                                    <div className="text-center py-16">
                                        <div className="mx-auto w-20 h-20 rounded-full bg-base-200 flex items-center justify-center mb-4">
                                            <ImageIcon className="w-10 h-10 text-base-content/30" aria-hidden="true" />
                                        </div>
                                        <h3 className="font-semibold text-lg text-base-content/70">
                                            No hay imágenes aún
                                        </h3>
                                        <p className="text-sm text-base-content/50 mt-1">
                                            Sube tu primera imagen para comenzar tu galería
                                        </p>
                                    </div>
                                ) : (
                                    /* Grid de imágenes */
                                    <div
                                        className="grid grid-cols-2 md:grid-cols-3 gap-4"
                                        role="list"
                                        aria-label="Galería de imágenes"
                                    >
                                        {images.map((image: CloudinaryImage) => (
                                            <div
                                                key={image.public_id}
                                                role="listitem"
                                                className="group relative aspect-square rounded-xl overflow-hidden bg-base-200 shadow-sm hover:shadow-lg transition-shadow"
                                            >
                                                <img
                                                    src={image.secure_url}
                                                    alt={`Imagen ${image.public_id.split('/').pop()}`}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                />

                                                {/* Overlay con acciones */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                                        <div className="flex justify-center gap-2">
                                                            {/* Ver en grande */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalImage({
                                                                    url: image.secure_url,
                                                                    publicId: image.public_id
                                                                })}
                                                                className="btn btn-circle btn-sm bg-white/20 border-0 text-white hover:bg-white/40"
                                                                aria-label="Ver imagen en grande"
                                                            >
                                                                <ZoomIn className="w-4 h-4" />
                                                            </button>

                                                            {/* Descargar */}
                                                            <a
                                                                href={image.secure_url}
                                                                download
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-circle btn-sm bg-white/20 border-0 text-white hover:bg-white/40"
                                                                aria-label="Descargar imagen"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </a>

                                                            {/* Eliminar - Ahora abre el modal */}
                                                            <button
                                                                type="button"
                                                                onClick={() => openDeleteConfirmation(image.public_id, image.secure_url)}
                                                                className="btn btn-circle btn-sm bg-error/80 border-0 text-white hover:bg-error"
                                                                aria-label="Eliminar imagen"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Indicador de carga al eliminar */}
                                                {navigation.formData?.get("publicId") === image.public_id && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <span className="loading loading-spinner loading-lg text-white"></span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* ===== MODAL DE VISTA PREVIA ===== */}
                {modalImage && (
                    <dialog
                        className="modal modal-open"
                        onClick={() => setModalImage(null)}
                        aria-label="Vista ampliada de imagen"
                    >
                        <div
                            className="modal-box max-w-5xl w-full p-2 bg-base-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="btn btn-circle btn-sm absolute right-3 top-3 z-10 bg-base-100 shadow-lg"
                                onClick={() => setModalImage(null)}
                                aria-label="Cerrar vista previa"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <figure className="relative">
                                <img
                                    src={modalImage.url}
                                    alt="Vista ampliada"
                                    className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                                />
                            </figure>

                            {/* Acciones del modal */}
                            <div className="flex justify-center gap-3 mt-4 pb-2">
                                <a
                                    href={modalImage.url}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar
                                </a>
                                <button
                                    type="button"
                                    onClick={() => openDeleteConfirmation(modalImage.publicId, modalImage.url)}
                                    className="btn btn-error btn-sm gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            </div>
                        </div>

                        <form method="dialog" className="modal-backdrop bg-black/80">
                            <button onClick={() => setModalImage(null)}>cerrar</button>
                        </form>
                    </dialog>
                )}

                {/* ===== MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ===== */}
                {deleteConfirmation && (
                    <dialog
                        className="modal modal-open"
                        onClick={closeDeleteConfirmation}
                        aria-labelledby="delete-modal-title"
                        aria-describedby="delete-modal-description"
                    >
                        <div
                            className="modal-box max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Icono de advertencia */}
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-error" aria-hidden="true" />
                                </div>
                            </div>

                            {/* Título */}
                            <h3
                                id="delete-modal-title"
                                className="font-bold text-lg text-center"
                            >
                                ¿Eliminar esta imagen?
                            </h3>

                            {/* Descripción */}
                            <p
                                id="delete-modal-description"
                                className="py-4 text-center text-base-content/70"
                            >
                                Esta acción no se puede deshacer. La imagen será eliminada permanentemente de la galería.
                            </p>

                            {/* Vista previa de la imagen a eliminar */}
                            {deleteConfirmation.imageUrl && (
                                <div className="flex justify-center mb-4">
                                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-error/30">
                                        <img
                                            src={deleteConfirmation.imageUrl}
                                            alt="Imagen a eliminar"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-error/10"></div>
                                    </div>
                                </div>
                            )}

                            {/* Formulario oculto para eliminar */}
                            <Form
                                ref={deleteFormRef}
                                method="post"
                                className="hidden"
                            >
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="publicId" value={deleteConfirmation.publicId} />
                            </Form>

                            {/* Botones de acción */}
                            <div className="modal-action justify-center gap-3">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={closeDeleteConfirmation}
                                    disabled={isDeleting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-error gap-2"
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
                                            Eliminando...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                                            Sí, eliminar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Backdrop */}
                        <form method="dialog" className="modal-backdrop bg-black/60">
                            <button onClick={closeDeleteConfirmation}>cerrar</button>
                        </form>
                    </dialog>
                )}
            </div>
        </main>
    );
}