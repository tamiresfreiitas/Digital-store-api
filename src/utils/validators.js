const HttpError = require('./HttpError');

const MAX_STRING = 255; // tamanho do VARCHAR padrão do Sequelize STRING

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v);
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

function requireString(value, field, { required = true, max = MAX_STRING } = {}) {
  if (value === undefined || value === null) {
    if (required) throw HttpError.badRequest(`O campo "${field}" é obrigatório`);
    return undefined;
  }
  if (typeof value !== 'string' || (required && value.trim() === '')) {
    throw HttpError.badRequest(`O campo "${field}" deve ser um texto válido`);
  }
  if (value.length > max) {
    throw HttpError.badRequest(`O campo "${field}" deve ter no máximo ${max} caracteres`);
  }
  return value.trim();
}

function optionalBoolean(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    throw HttpError.badRequest(`O campo "${field}" deve ser booleano`);
  }
  return value;
}

function parseId(raw) {
  const str = String(raw);
  if (!/^\d+$/.test(str) || Number(str) < 1) throw HttpError.notFound();
  return Number(str);
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= MAX_STRING;
}

/** Converte ?limit & ?page em números validados. limit = -1 retorna tudo. */
function parsePagination(query) {
  let limit = 12;
  let page = 1;

  if (query.limit !== undefined) {
    if (!/^-?\d+$/.test(String(query.limit))) throw HttpError.badRequest('Parâmetro "limit" inválido');
    limit = Number(query.limit);
    if (limit !== -1 && limit < 1) throw HttpError.badRequest('Parâmetro "limit" inválido');
  }
  if (query.page !== undefined) {
    if (!/^\d+$/.test(String(query.page)) || Number(query.page) < 1) {
      throw HttpError.badRequest('Parâmetro "page" inválido');
    }
    page = Number(query.page);
  }
  return { limit, page, offset: limit === -1 ? 0 : (page - 1) * limit };
}

/** Converte ?fields=a,b em array validado contra a lista permitida. */
function parseFields(raw, allowed) {
  if (raw === undefined) return null;
  if (typeof raw !== 'string' || raw.trim() === '') throw HttpError.badRequest('Parâmetro "fields" inválido');
  const fields = [...new Set(raw.split(',').map((f) => f.trim()).filter(Boolean))];
  const invalid = fields.filter((f) => !allowed.includes(f));
  if (!fields.length || invalid.length) {
    throw HttpError.badRequest(`Campos inválidos: ${invalid.join(', ') || raw}`);
  }
  return fields;
}

module.exports = {
  MAX_STRING,
  isPlainObject,
  isInt,
  isNumber,
  isEmail,
  requireString,
  optionalBoolean,
  parseId,
  parsePagination,
  parseFields,
};
