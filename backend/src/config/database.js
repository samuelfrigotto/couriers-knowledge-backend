// backend/src/config/database.js

const { Pool } = require('pg');

// O construtor do Pool vai ler automaticamente as variáveis de ambiente
// (PGUSER, PGHOST, PGDATABASE, PGPASSWORD, PGPORT)
// ou podemos passá-las explicitamente.
// Para seguir nosso padrão .env, vamos usar process.env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Exportamos uma função 'query' que usa o nosso pool de conexões.
// Isso facilita a execução de queries de qualquer lugar do nosso app.
module.exports = {
    query: (text, params) => pool.query(text, params),
};