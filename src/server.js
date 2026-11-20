const config = require('./config');
const app = require('./app');
const { sequelize } = require('./models');

async function start() {
  if (!config.jwt.secret) {
    throw new Error('Defina JWT_SECRET no arquivo .env');
  }
  await sequelize.authenticate();
  app.listen(config.port, () => console.log(`API rodando em http://localhost:${config.port}`));
}

start().catch((err) => {
  console.error('Falha ao iniciar a aplicação:', err.message);
  process.exit(1);
});
