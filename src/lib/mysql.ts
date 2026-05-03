import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function mysqlConfigured(): boolean {
  return Boolean(
    process.env.DB_HOST &&
      process.env.DB_USER &&
      process.env.DB_PASSWORD !== undefined &&
      process.env.DB_NAME
  );
}

export function getMysqlPool(): mysql.Pool {
  if (!mysqlConfigured()) {
    throw new Error("Brak zmiennych DB_HOST, DB_USER, DB_PASSWORD, DB_NAME w środowisku.");
  }
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 5,
      ssl: process.env.DB_SSL === "true" ? {} : undefined,
    });
  }
  return pool;
}
