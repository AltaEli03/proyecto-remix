import mariadb from 'mariadb';

const pool = mariadb.createPool({
host: process.env.DB_HOST,
user: process.env.DB_USER,
port: 3306,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
connectionLimit: 10,
acquireTimeout: 10000
});

export default pool;