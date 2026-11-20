const { Category } = require('../models');
const HttpError = require('../utils/HttpError');
const {
  requireString,
  optionalBoolean,
  parseId,
  parsePagination,
  parseFields,
} = require('../utils/validators');

const FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

const serialize = (c) => ({ id: c.id, name: c.name, slug: c.slug, use_in_menu: Boolean(c.use_in_menu) });

function validate(body = {}) {
  return {
    name: requireString(body.name, 'name'),
    slug: requireString(body.slug, 'slug'),
    use_in_menu: optionalBoolean(body.use_in_menu, 'use_in_menu') ?? false,
  };
}

async function search(query) {
  const { limit, page, offset } = parsePagination(query);
  const fields = parseFields(query.fields, FIELDS);

  const where = {};
  if (query.use_in_menu !== undefined) {
    if (!['true', 'false'].includes(query.use_in_menu)) {
      throw HttpError.badRequest('Parâmetro "use_in_menu" inválido');
    }
    where.use_in_menu = query.use_in_menu === 'true';
  }

  const { rows, count } = await Category.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    ...(limit !== -1 && { limit, offset }),
  });

  const data = rows.map((row) => {
    const item = serialize(row);
    if (!fields) return item;
    return Object.fromEntries(fields.map((f) => [f, item[f]]));
  });

  return { data, total: count, limit, page };
}

async function getById(rawId) {
  const category = await Category.findByPk(parseId(rawId));
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  return serialize(category);
}

async function create(body) {
  const category = await Category.create(validate(body));
  return serialize(category);
}

async function update(rawId, body) {
  const category = await Category.findByPk(parseId(rawId));
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  await category.update(validate(body));
}

async function remove(rawId) {
  const category = await Category.findByPk(parseId(rawId));
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  await category.destroy();
}

module.exports = { search, getById, create, update, remove };
