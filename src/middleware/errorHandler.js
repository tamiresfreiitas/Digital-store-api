const HttpError = require('../utils/HttpError');
const config = require('../config');

function notFound(req, res, next) {
  next(HttpError.notFound('Rota não encontrada'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  // JSON malformado ou body grande demais
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ message: 'Corpo da requisição inválido' });
  }
  if (err.name === 'SequelizeUniqueConstraintError' || err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: 'Dados da requisição incorretos' });
  }
  if (!config.isTest) console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}

module.exports = { notFound, errorHandler };
