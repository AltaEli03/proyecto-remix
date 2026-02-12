// app/routes/crud.tsx
import { type ActionFunctionArgs, data } from "react-router";
import { Form, useActionData, useNavigation, useLoaderData, useFetcher, useSearchParams } from "react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import {
    Plus,
    Pencil,
    Trash2,
    Save,
    X,
    Search,
    Database,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Calendar,
    Filter,
    RotateCcw,
    Loader2,
} from "lucide-react";
import { query, execute } from "~/utils/db.server";
import { Breadcrumb } from "~/components/Breadcrumb";
import { Alert } from "~/components/Alert";
import { Navbar } from "~/components/Navbar";
import { getOptionalUser } from "~/utils/auth.guard";
import type { Route } from "./+types/crud";

// Tipos
interface CaptchaRecord {
    id: number;
    nombre: string;
    fecha_registro: string | null;
}

interface LoaderData {
    user: any;
    records: CaptchaRecord[];
    total: number;
    page: number;
    limit: number;
    search: string;
}

interface ActionResponse {
    success: boolean;
    message?: string | null;
    error?: string | null;
    action?: string;
}

// Tipos para ordenamiento
type SortField = 'id' | 'nombre' | 'fecha_registro';
type SortDirection = 'asc' | 'desc' | null;

// ⭐ Custom Hook para Debounce
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Gestión de Captcha | Mi App" },
        { name: "description", content: "CRUD completo para la tabla captcha" },
    ];
}

// --- LOADER ---
export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
    const user = await getOptionalUser(request);
    const url = new URL(request.url);

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "10")));
    const search = url.searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    try {
        let whereClause = "";
        let params: any[] = [];

        if (search.trim()) {
            whereClause = "WHERE nombre LIKE ?";
            params.push(`%${search.trim()}%`);
        }

        const countResult = await query<{ total: number }>(
            `SELECT COUNT(*) as total FROM captcha ${whereClause}`,
            params
        );
        const total = countResult[0]?.total || 0;

        const records = await query<CaptchaRecord>(
            `SELECT id, nombre, fecha_registro FROM captcha ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return { user, records, total, page, limit, search };
    } catch (error) {
        console.error("Error loading captcha records:", error);
        return { user, records: [], total: 0, page: 1, limit: 10, search: "" };
    }
}

// --- ACTION ---
export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent") as string;

    try {
        switch (intent) {
            case "create": {
                const nombre = formData.get("nombre") as string;

                if (!nombre?.trim()) {
                    return data<ActionResponse>(
                        { success: false, error: "El nombre es obligatorio.", action: "create" },
                        { status: 400 }
                    );
                }

                await execute("INSERT INTO captcha (nombre) VALUES (?)", [nombre.trim()]);

                return data<ActionResponse>({
                    success: true,
                    message: "Registro creado exitosamente.",
                    action: "create",
                });
            }

            case "update": {
                const id = formData.get("id") as string;
                const nombre = formData.get("nombre") as string;

                if (!id || !nombre?.trim()) {
                    return data<ActionResponse>(
                        { success: false, error: "ID y nombre son obligatorios.", action: "update" },
                        { status: 400 }
                    );
                }

                const result = await execute(
                    "UPDATE captcha SET nombre = ? WHERE id = ?",
                    [nombre.trim(), parseInt(id)]
                );

                if (result.affectedRows === 0) {
                    return data<ActionResponse>(
                        { success: false, error: "Registro no encontrado.", action: "update" },
                        { status: 404 }
                    );
                }

                return data<ActionResponse>({
                    success: true,
                    message: "Registro actualizado exitosamente.",
                    action: "update",
                });
            }

            case "delete": {
                const id = formData.get("id") as string;

                if (!id) {
                    return data<ActionResponse>(
                        { success: false, error: "ID es obligatorio.", action: "delete" },
                        { status: 400 }
                    );
                }

                const result = await execute("DELETE FROM captcha WHERE id = ?", [parseInt(id)]);

                if (result.affectedRows === 0) {
                    return data<ActionResponse>(
                        { success: false, error: "Registro no encontrado.", action: "delete" },
                        { status: 404 }
                    );
                }

                return data<ActionResponse>({
                    success: true,
                    message: "Registro eliminado exitosamente.",
                    action: "delete",
                });
            }

            case "delete-multiple": {
                const ids = formData.get("ids") as string;

                if (!ids) {
                    return data<ActionResponse>(
                        { success: false, error: "No hay registros seleccionados.", action: "delete-multiple" },
                        { status: 400 }
                    );
                }

                const idArray = ids.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));

                if (idArray.length === 0) {
                    return data<ActionResponse>(
                        { success: false, error: "IDs inválidos.", action: "delete-multiple" },
                        { status: 400 }
                    );
                }

                const placeholders = idArray.map(() => "?").join(",");
                const result = await execute(
                    `DELETE FROM captcha WHERE id IN (${placeholders})`,
                    idArray
                );

                return data<ActionResponse>({
                    success: true,
                    message: `${result.affectedRows} registro(s) eliminado(s) exitosamente.`,
                    action: "delete-multiple",
                });
            }

            default:
                return data<ActionResponse>(
                    { success: false, error: "Acción no válida.", action: "unknown" },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("Error in action:", error);
        return data<ActionResponse>(
            { success: false, error: "Error de base de datos. Intente nuevamente." },
            { status: 500 }
        );
    }
}

// --- FRONTEND ---
export default function CaptchaCrud() {
    const loaderData = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();

    // ⭐ Fetcher para búsqueda asíncrona
    const searchFetcher = useFetcher<LoaderData>();

    // Estados existentes
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CaptchaRecord | null>(null);
    const [deleteRecord, setDeleteRecord] = useState<CaptchaRecord | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showDeleteMultipleModal, setShowDeleteMultipleModal] = useState(false);

    // ⭐ Estado de búsqueda asíncrona
    const [searchInput, setSearchInput] = useState(loaderData.search);
    const debouncedSearch = useDebounce(searchInput, 300); // 300ms de delay

    // Estados para ordenamiento y filtrado por fecha
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    // Refs
    const createInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const isFirstRender = useRef(true);

    const isSubmitting = navigation.state === "submitting";

    // ⭐ Determinar qué datos mostrar (del fetcher o del loader)
    const currentData = searchFetcher.data ?? loaderData;
    const { user, records, total, page, limit, search } = currentData;

    // ⭐ Estado de carga de búsqueda
    const isSearching = searchFetcher.state === "loading";

    const totalPages = Math.ceil(total / limit);

    // ⭐ Efecto para búsqueda asíncrona con debounce
    useEffect(() => {
        // Evitar búsqueda en el primer render
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Construir URL de búsqueda
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) {
            params.set("search", debouncedSearch.trim());
        }
        params.set("page", "1"); // Resetear a página 1 en cada búsqueda
        params.set("limit", limit.toString());

        // Hacer fetch asíncrono
        searchFetcher.load(`/crud?${params.toString()}`);

        // Actualizar URL sin recargar (opcional - para mantener URL sincronizada)
        const newParams = new URLSearchParams(searchParams);
        if (debouncedSearch.trim()) {
            newParams.set("search", debouncedSearch.trim());
        } else {
            newParams.delete("search");
        }
        newParams.set("page", "1");
        setSearchParams(newParams, { replace: true });

    }, [debouncedSearch]);

    // ⭐ Función para manejar el ordenamiento
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortField(null);
                setSortDirection(null);
            } else {
                setSortDirection('asc');
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // ⭐ Función auxiliar para obtener fecha en formato YYYY-MM-DD (zona local)
    const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // ⭐ DATOS PROCESADOS con useMemo
    const processedRecords = useMemo(() => {
        let result = [...records];

        // Filtrar por rango de fechas
        if (dateFrom || dateTo) {
            result = result.filter(record => {
                // Si no tiene fecha, excluir del filtro
                if (!record.fecha_registro) return false;

                try {
                    // Convertir la fecha del registro a objeto Date
                    const recordDate = new Date(record.fecha_registro);

                    // Verificar que la fecha sea válida
                    if (isNaN(recordDate.getTime())) {
                        console.warn('Fecha inválida:', record.fecha_registro);
                        return false;
                    }

                    // Obtener la fecha en formato YYYY-MM-DD (zona horaria local)
                    const recordDateStr = getLocalDateString(recordDate);

                    // Comparar strings directamente (lexicográficamente correcto para YYYY-MM-DD)
                    if (dateFrom && dateTo) {
                        return recordDateStr >= dateFrom && recordDateStr <= dateTo;
                    } else if (dateFrom) {
                        return recordDateStr >= dateFrom;
                    } else if (dateTo) {
                        return recordDateStr <= dateTo;
                    }
                } catch (error) {
                    console.error('Error procesando fecha:', record.fecha_registro, error);
                    return false;
                }

                return true;
            });
        }

        // Ordenar según campo y dirección
        if (sortField && sortDirection) {
            result.sort((a, b) => {
                let aVal: any = a[sortField];
                let bVal: any = b[sortField];

                // Manejar nulls/undefined
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';

                // Convertir según el tipo de campo
                if (sortField === 'id') {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                } else if (sortField === 'fecha_registro') {
                    // Usar timestamp para ordenar fechas
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;

                    // Verificar fechas válidas
                    if (isNaN(aVal)) aVal = 0;
                    if (isNaN(bVal)) bVal = 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }

                if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                } else {
                    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                }
            });
        }

        return result;
    }, [records, sortField, sortDirection, dateFrom, dateTo]);

    // Icono de ordenamiento dinámico
    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="w-4 h-4 opacity-40" />;
        }
        if (sortDirection === 'asc') {
            return <ArrowUp className="w-4 h-4 text-primary" />;
        }
        return <ArrowDown className="w-4 h-4 text-primary" />;
    };

    // Limpiar filtros
    const handleClearFilters = () => {
        setSortField(null);
        setSortDirection(null);
        setDateFrom('');
        setDateTo('');
    };

    // Verificar si hay filtros activos
    const hasActiveFilters = sortField !== null || dateFrom !== '' || dateTo !== '';

    // Cerrar modales después de acción exitosa
    useEffect(() => {
        if (actionData?.success) {
            setIsCreateModalOpen(false);
            setEditingRecord(null);
            setDeleteRecord(null);
            setShowDeleteMultipleModal(false);
            setSelectedIds(new Set());

            // ⭐ Refrescar datos después de una acción exitosa
            const params = new URLSearchParams();
            if (searchInput.trim()) params.set("search", searchInput.trim());
            params.set("page", page.toString());
            params.set("limit", limit.toString());
            searchFetcher.load(`/crud?${params.toString()}`);
        }
    }, [actionData]);

    // Focus en inputs de modales
    useEffect(() => {
        if (isCreateModalOpen && createInputRef.current) {
            createInputRef.current.focus();
        }
    }, [isCreateModalOpen]);

    useEffect(() => {
        if (editingRecord && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingRecord]);

    // ⭐ Handler para limpiar búsqueda
    const handleClearSearch = () => {
        setSearchInput("");
        searchInputRef.current?.focus();
    };

    // ⭐ Handler para cambio de página (asíncrono)
    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams();
        if (searchInput.trim()) params.set("search", searchInput.trim());
        params.set("page", newPage.toString());
        params.set("limit", limit.toString());

        searchFetcher.load(`/crud?${params.toString()}`);

        // Actualizar URL
        setSearchParams(params, { replace: true });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === processedRecords.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(processedRecords.map(r => r.id)));
        }
    };

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "-";
        }
    };

    return (
        <main className="min-h-screen bg-base-200 p-4">
            <div className="container mx-auto max-w-6xl">
                <Navbar user={user} currentPath="/crud" />

                <Breadcrumb items={[{ label: "Gestión Captcha" }]} />

                {/* Alertas de feedback */}
                {actionData?.error && (
                    <Alert
                        type="error"
                        message={actionData.error}
                        dismissible
                        className="mb-4"
                    />
                )}
                {actionData?.success && (
                    <Alert
                        type="success"
                        message={actionData.message}
                        dismissible
                        autoClose={5000}
                        className="mb-4"
                    />
                )}

                {/* Card principal */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <Database className="w-8 h-8 text-primary" />
                                <div>
                                    <h1 className="card-title text-2xl">Gestión de Captcha</h1>
                                    <p className="text-sm text-base-content/60">
                                        {processedRecords.length} de {total} registro{total !== 1 ? "s" : ""}
                                        {hasActiveFilters && (
                                            <span className="badge badge-primary badge-sm ml-2">
                                                Filtros activos
                                            </span>
                                        )}
                                        {/* ⭐ Indicador de búsqueda activa */}
                                        {searchInput && (
                                            <span className="badge badge-secondary badge-sm ml-2">
                                                Buscando: "{searchInput}"
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {/* Botón mostrar/ocultar filtros */}
                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`btn btn-sm gap-2 ${showFilters ? 'btn-secondary' : 'btn-neutral'}`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filtros
                                </button>

                                {/* Botón limpiar filtros */}
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="btn btn-info btn-sm gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Limpiar
                                    </button>
                                )}

                                {/* Botón eliminar múltiples */}
                                {selectedIds.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteMultipleModal(true)}
                                        className="btn btn-error btn-sm gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar ({selectedIds.size})
                                    </button>
                                )}

                                {/* Botón crear */}
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="btn btn-primary btn-sm gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nuevo Registro
                                </button>
                            </div>
                        </div>

                        {/* PANEL DE FILTROS (expandible) */}
                        <div className={`collapse ${showFilters ? 'collapse-open' : ''}`}>
                            <div className="collapse-content px-0">
                                <div className="bg-base-200 rounded-lg p-4 mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Filtro por fecha desde */}
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Fecha desde
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="input input-bordered input-sm"
                                            />
                                        </div>

                                        {/* Filtro por fecha hasta */}
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Fecha hasta
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="input input-bordered input-sm"
                                            />
                                        </div>

                                        {/* Selector de ordenamiento */}
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Ordenar por</span>
                                            </label>
                                            <select
                                                value={sortField || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value as SortField | '';
                                                    if (value === '') {
                                                        setSortField(null);
                                                        setSortDirection(null);
                                                    } else {
                                                        setSortField(value);
                                                        if (!sortDirection) setSortDirection('asc');
                                                    }
                                                }}
                                                className="select select-bordered select-sm"
                                            >
                                                <option value="">Sin ordenar</option>
                                                <option value="id">ID</option>
                                                <option value="nombre">Nombre</option>
                                                <option value="fecha_registro">Fecha Registro</option>
                                            </select>
                                        </div>

                                        {/* Dirección de ordenamiento */}
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Dirección</span>
                                            </label>
                                            <select
                                                value={sortDirection || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value as SortDirection;
                                                    setSortDirection(value);
                                                    if (value && !sortField) setSortField('id');
                                                }}
                                                disabled={!sortField}
                                                className="select select-bordered select-sm"
                                            >
                                                <option value="">-</option>
                                                <option value="asc">Ascendente ↑</option>
                                                <option value="desc">Descendente ↓</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Resumen de filtros activos */}
                                    {hasActiveFilters && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {sortField && (
                                                <span className="badge badge-outline gap-1">
                                                    Ordenado por: {sortField} ({sortDirection})
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSortField(null); setSortDirection(null); }}
                                                        className="btn btn-ghost btn-xs p-0 h-auto min-h-0"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            )}
                                            {dateFrom && (
                                                <span className="badge badge-outline gap-1">
                                                    Desde: {dateFrom}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDateFrom('')}
                                                        className="btn btn-ghost btn-xs p-0 h-auto min-h-0"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            )}
                                            {dateTo && (
                                                <span className="badge badge-outline gap-1">
                                                    Hasta: {dateTo}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDateTo('')}
                                                        className="btn btn-ghost btn-xs p-0 h-auto min-h-0"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ⭐ BARRA DE BÚSQUEDA ASÍNCRONA */}
                        <div className="flex gap-2 mb-4">
                            <div className="join flex-1 relative">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Buscar por nombre... (búsqueda automática)"
                                    className="input input-bordered join-item flex-1 pr-10"
                                />
                                {/* ⭐ Indicador de carga en el input */}
                                <div className="absolute right-14 top-1/2 -translate-y-1/2">
                                    {isSearching ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                    ) : searchInput ? (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="btn btn-ghost btn-xs btn-circle"
                                            title="Limpiar búsqueda"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    ) : null}
                                </div>
                                <div className="join-item btn btn-primary pointer-events-none">
                                    <Search className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* ⭐ Mensaje de búsqueda */}
                        {searchInput && !isSearching && (
                            <div className="text-sm text-base-content/60 mb-2 flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                Mostrando resultados para: <strong>"{searchInput}"</strong>
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="link link-primary text-sm"
                                >
                                    (Limpiar)
                                </button>
                            </div>
                        )}

                        {/* TABLA con headers clickeables para ordenar */}
                        <div className="overflow-x-auto relative">
                            {/* ⭐ Overlay de carga */}
                            {isSearching && (
                                <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm z-10 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <span className="text-sm text-base-content/70">Buscando...</span>
                                    </div>
                                </div>
                            )}

                            <table className="table table-zebra">
                                <thead>
                                    <tr>
                                        <th>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-sm"
                                                    checked={processedRecords.length > 0 && selectedIds.size === processedRecords.length}
                                                    onChange={toggleSelectAll}
                                                />
                                            </label>
                                        </th>
                                        {/* Header ID - Clickeable */}
                                        <th
                                            className="cursor-pointer select-none hover:bg-base-200 transition-colors"
                                            onClick={() => handleSort('id')}
                                        >
                                            <div className="flex items-center gap-2">
                                                ID
                                                {getSortIcon('id')}
                                            </div>
                                        </th>
                                        {/* Header Nombre - Clickeable */}
                                        <th
                                            className="cursor-pointer select-none hover:bg-base-200 transition-colors"
                                            onClick={() => handleSort('nombre')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Nombre
                                                {getSortIcon('nombre')}
                                            </div>
                                        </th>
                                        {/* Header Fecha - Clickeable */}
                                        <th
                                            className="cursor-pointer select-none hover:bg-base-200 transition-colors"
                                            onClick={() => handleSort('fecha_registro')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Fecha Registro
                                                {getSortIcon('fecha_registro')}
                                            </div>
                                        </th>
                                        <th className="text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8">
                                                <div className="flex flex-col items-center gap-2 text-base-content/60">
                                                    <Database className="w-12 h-12 opacity-50" />
                                                    <p>No hay registros</p>
                                                    {(searchInput || hasActiveFilters) && (
                                                        <p className="text-sm">
                                                            {searchInput && `No se encontraron resultados para "${searchInput}"`}
                                                            {hasActiveFilters && " con los filtros aplicados"}
                                                        </p>
                                                    )}
                                                    {(searchInput || hasActiveFilters) && (
                                                        <div className="flex gap-2 mt-2">
                                                            {searchInput && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleClearSearch}
                                                                    className="btn btn-info btn-sm gap-1"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                    Limpiar búsqueda
                                                                </button>
                                                            )}
                                                            {hasActiveFilters && (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleClearFilters}
                                                                    className="btn btn-neutral btn-sm gap-1"
                                                                >
                                                                    <RotateCcw className="w-4 h-4" />
                                                                    Limpiar filtros
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        processedRecords.map((record) => (
                                            <tr
                                                key={record.id}
                                                className="hover transition-all duration-200"
                                                style={{
                                                    animation: 'fadeIn 0.2s ease-out'
                                                }}
                                            >
                                                <th>
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-sm"
                                                            checked={selectedIds.has(record.id)}
                                                            onChange={() => toggleSelect(record.id)}
                                                        />
                                                    </label>
                                                </th>
                                                <td>
                                                    <span className="badge badge-ghost badge-sm font-mono">
                                                        #{record.id}
                                                    </span>
                                                </td>
                                                <td>
                                                    {/* ⭐ Resaltar texto de búsqueda */}
                                                    <div className="font-medium">
                                                        {searchInput ? (
                                                            <HighlightText
                                                                text={record.nombre}
                                                                highlight={searchInput}
                                                            />
                                                        ) : (
                                                            record.nombre
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="text-sm text-base-content/70">
                                                        {formatDate(record.fecha_registro)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingRecord(record)}
                                                            className="btn btn-warning btn-xs gap-1"
                                                            aria-label={`Editar ${record.nombre}`}
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteRecord(record)}
                                                            className="btn btn-error btn-xs gap-1"
                                                            aria-label={`Eliminar ${record.nombre}`}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                                <p className="text-sm text-base-content/60">
                                    Mostrando {processedRecords.length} registros
                                    {hasActiveFilters && ` (filtrados de ${records.length})`}
                                    {' '}| Página {page} de {totalPages}
                                </p>
                                <div className="join">
                                    <button
                                        type="button"
                                        className="join-item btn btn-sm"
                                        disabled={page <= 1 || isSearching}
                                        onClick={() => handlePageChange(page - 1)}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                type="button"
                                                className={`join-item btn btn-sm ${page === pageNum ? "btn-active" : ""}`}
                                                disabled={isSearching}
                                                onClick={() => handlePageChange(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        className="join-item btn btn-sm"
                                        disabled={page >= totalPages || isSearching}
                                        onClick={() => handlePageChange(page + 1)}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Crear */}
            <dialog className={`modal ${isCreateModalOpen ? "modal-open" : ""}`}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Crear Nuevo Registro
                    </h3>

                    <Form method="post" className="mt-4">
                        <input type="hidden" name="intent" value="create" />

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">
                                    Nombre <span className="text-error">*</span>
                                </span>
                            </label>
                            <input
                                ref={createInputRef}
                                type="text"
                                name="nombre"
                                required
                                className="input input-bordered w-full"
                                placeholder="Ingrese el nombre..."
                            />
                        </div>

                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-error"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </Form>
                </div>
                <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)} />
            </dialog>

            {/* Modal Editar */}
            <dialog className={`modal ${editingRecord ? "modal-open" : ""}`}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Pencil className="w-5 h-5 text-warning" />
                        Editar Registro #{editingRecord?.id}
                    </h3>

                    <Form method="post" className="mt-4" key={editingRecord?.id}>
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={editingRecord?.id || ""} />

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">
                                    Nombre <span className="text-error">*</span>
                                </span>
                            </label>
                            <input
                                ref={editInputRef}
                                type="text"
                                name="nombre"
                                required
                                defaultValue={editingRecord?.nombre || ""}
                                className="input input-bordered w-full"
                                placeholder="Ingrese el nombre..."
                            />
                        </div>

                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-error"
                                onClick={() => setEditingRecord(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-warning gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm" />
                                        Actualizando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Actualizar
                                    </>
                                )}
                            </button>
                        </div>
                    </Form>
                </div>
                <div className="modal-backdrop" onClick={() => setEditingRecord(null)} />
            </dialog>

            {/* Modal Eliminar Individual */}
            <dialog className={`modal ${deleteRecord ? "modal-open" : ""}`}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-error">
                        <AlertTriangle className="w-5 h-5" />
                        Confirmar Eliminación
                    </h3>

                    <p className="py-4">
                        ¿Estás seguro de que deseas eliminar el registro{" "}
                        <strong>"{deleteRecord?.nombre}"</strong>?
                    </p>
                    <p className="text-sm text-base-content/60">
                        Esta acción no se puede deshacer.
                    </p>

                    <Form method="post" className="mt-4">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={deleteRecord?.id || ""} />

                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-warning"
                                onClick={() => setDeleteRecord(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-error gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm" />
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </>
                                )}
                            </button>
                        </div>
                    </Form>
                </div>
                <div className="modal-backdrop" onClick={() => setDeleteRecord(null)} />
            </dialog>

            {/* Modal Eliminar Múltiples */}
            <dialog className={`modal ${showDeleteMultipleModal ? "modal-open" : ""}`}>
                <div className="modal-box">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-error">
                        <AlertTriangle className="w-5 h-5" />
                        Eliminar Múltiples Registros
                    </h3>

                    <p className="py-4">
                        ¿Estás seguro de que deseas eliminar{" "}
                        <strong>{selectedIds.size} registro(s)</strong>?
                    </p>
                    <p className="text-sm text-base-content/60">
                        Esta acción no se puede deshacer.
                    </p>

                    <Form method="post" className="mt-4">
                        <input type="hidden" name="intent" value="delete-multiple" />
                        <input type="hidden" name="ids" value={Array.from(selectedIds).join(",")} />

                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-warning"
                                onClick={() => setShowDeleteMultipleModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-error gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm" />
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar {selectedIds.size}
                                    </>
                                )}
                            </button>
                        </div>
                    </Form>
                </div>
                <div className="modal-backdrop" onClick={() => setShowDeleteMultipleModal(false)} />
            </dialog>

            {/* Estilos para animación */}
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0.5;
                        transform: translateY(-2px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </main>
    );
}

// ⭐ Componente para resaltar texto de búsqueda
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }

    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, index) =>
                regex.test(part) ? (
                    <mark key={index} className="bg-warning/40 text-warning-content rounded px-0.5">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                )
            )}
        </span>
    );
}