require('./index'); // garante que o dotenv foi carregado
const { Sequelize } = require('sequelize');

const define = {
  timestamps: true,
  underscored: true, // created_at / updated_at / product_id ...
};

const useSqlite = process.env.NODE_ENV === 'test' && process.env.TEST_DB !== 'mysql';

// Nos testes usamos SQLite em memória (rápido, sem servidor).
// Para testar contra o MySQL de verdade:  TEST_DB=mysql npm test  (usa as variáveis DB_*)
const sequelize = useSqlite
  ? new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false, define })
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      dialect: 'mysql',
      logging: false,
      define,
    });

module.exports = sequelize;
