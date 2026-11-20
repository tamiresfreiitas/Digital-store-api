class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

HttpError.badRequest = (msg = 'Dados da requisição incorretos') => new HttpError(400, msg);
HttpError.unauthorized = (msg = 'Não autorizado') => new HttpError(401, msg);
HttpError.notFound = (msg = 'Recurso não encontrado') => new HttpError(404, msg);

module.exports = HttpError;
