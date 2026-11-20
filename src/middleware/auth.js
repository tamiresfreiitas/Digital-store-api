const jwt = require('jsonwebtoken');
const config = require('../config');
const HttpError = require('../utils/HttpError');

/**
 * Exige o cabeçalho "Authorization: Bearer <jwt>".
 * Sem token ou com token inválido/expirado => 401.
 */
module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(HttpError.unauthorized('Token de autorização não enviado'));
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    return next();
  } catch (err) {
    return next(HttpError.unauthorized('Token inválido ou expirado'));
  }
};
