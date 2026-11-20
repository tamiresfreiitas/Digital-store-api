// Configuração lida pelo sequelize-cli (ver .sequelizerc).
// Usa as mesmas variáveis DB_* do .env que a aplicação.
require('./index'); // carrega o dotenv

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  logging: false,
};

module.exports = {
  development: base,
  production: base,
  // em NODE_ENV=test as migrations rodam no SQLite em memória (ver tests/helpers.js)
  test: base,
};
