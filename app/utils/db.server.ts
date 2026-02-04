import mariadb from 'mariadb';

// Crear pool de conexiones
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: Number(process.env.DB_PORT) || 3306,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    acquireTimeout: 10000,
    // Importante para seguridad
    allowPublicKeyRetrieval: true,
    // Convertir tipos automáticamente
    bigIntAsNumber: true,
    insertIdAsNumber: true
});

// Tipo para resultados de INSERT
export interface InsertResult {
    affectedRows: number;
    insertId: number;
    warningStatus: number;
}

// Query simple
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(sql, params);
        // Eliminar metadatos de MariaDB
        return Array.isArray(result) ? [...result] : result;
    } finally {
        if (conn) conn.release();
    }
}

// Query que retorna un solo registro
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
}

// Para INSERT/UPDATE/DELETE
export async function execute(sql: string, params?: any[]): Promise<InsertResult> {
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(sql, params);
        return result as InsertResult;
    } finally {
        if (conn) conn.release();
    }
}

export async function transaction<T>(
    callback: (conn: mariadb.PoolConnection) => Promise<T>,
    options?: { maxRetries?: number; retryDelay?: number }
): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelay = options?.retryDelay ?? 100;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();
            const result = await callback(conn);
            await conn.commit();
            return result;

        } catch (error) {
            await conn.rollback();
            lastError = error instanceof Error ? error : new Error(String(error));

            // Si es un error de deadlock o lock timeout, reintentar
            const isRetryable =
                lastError.message.includes('Deadlock') ||
                lastError.message.includes('Lock wait timeout') ||
                lastError.message.includes('ER_LOCK_');

            if (isRetryable && attempt < maxRetries) {
                console.warn(`Transacción fallida (intento ${attempt}/${maxRetries}), reintentando...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                continue;
            }

            throw error;

        } finally {
            conn.release();
        }
    }

    throw lastError;
}

// Transacción con timeout
export async function transactionWithTimeout<T>(
    callback: (conn: mariadb.PoolConnection) => Promise<T>,
    timeoutMs: number = 30000
): Promise<T> {
    return new Promise(async (resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Transaction timeout exceeded'));
        }, timeoutMs);

        try {
            const result = await transaction(callback);
            clearTimeout(timer);
            resolve(result);
        } catch (error) {
            clearTimeout(timer);
            reject(error);
        }
    });
}

export default pool;