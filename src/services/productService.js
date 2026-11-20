const { Op } = require('sequelize');
const {
  sequelize,
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../models');
const HttpError = require('../utils/HttpError');
const media = require('../utils/media');
const {
  isPlainObject,
  isInt,
  isNumber,
  requireString,
  optionalBoolean,
  parseId,
  parsePagination,
  parseFields,
  MAX_STRING,
} = require('../utils/validators');

const COLUMN_FIELDS = [
  'id', 'enabled', 'name', 'slug', 'use_in_menu', 'stock', 'description', 'price', 'price_with_discount',
];
const RELATION_FIELDS = ['category_ids', 'images', 'options'];
const ALL_FIELDS = [...COLUMN_FIELDS, ...RELATION_FIELDS];

/* ------------------------------------------------------------------ */
/* Serialização                                                        */
/* ------------------------------------------------------------------ */

const serializeOption = (o) => ({
  id: o.id,
  title: o.title,
  shape: o.shape,
  radius: o.radius,
  type: o.type,
  values: o.values ? o.values.split(',') : [],
});

const serializeImage = (i) => ({ id: i.id, content: media.publicUrl(i.path) });

/** Carrega relações apenas para os produtos e campos pedidos (evita N+1 e joins com limit). */
async function buildProducts(products, fields) {
  const ids = products.map((p) => p.id);
  const wanted = (f) => !fields || fields.includes(f);

  const [links, images, options] = await Promise.all([
    wanted('category_ids') && ids.length
      ? ProductCategory.findAll({ where: { product_id: ids }, order: [['category_id', 'ASC']] })
      : [],
    wanted('images') && ids.length
      ? ProductImage.findAll({ where: { product_id: ids }, order: [['id', 'ASC']] })
      : [],
    wanted('options') && ids.length
      ? ProductOption.findAll({ where: { product_id: ids }, order: [['id', 'ASC']] })
      : [],
  ]);

  const group = (rows) =>
    rows.reduce((acc, r) => ((acc[r.product_id] ||= []).push(r), acc), {});
  const byCat = group(links);
  const byImg = group(images);
  const byOpt = group(options);

  return products.map((p) => {
    const full = {
      id: p.id,
      enabled: Boolean(p.enabled),
      name: p.name,
      slug: p.slug,
      use_in_menu: Boolean(p.use_in_menu),
      stock: p.stock,
      description: p.description,
      price: p.price,
      price_with_discount: p.price_with_discount,
      category_ids: (byCat[p.id] || []).map((l) => l.category_id),
      images: (byImg[p.id] || []).map(serializeImage),
      options: (byOpt[p.id] || []).map(serializeOption),
    };
    if (!fields) return full;
    return Object.fromEntries(fields.map((f) => [f, full[f]]));
  });
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

function parseIdList(raw, name) {
  if (typeof raw !== 'string' || !/^\d+(,\d+)*$/.test(raw)) {
    throw HttpError.badRequest(`Parâmetro "${name}" inválido`);
  }
  return raw.split(',').map(Number);
}

async function search(query) {
  const { limit, page, offset } = parsePagination(query);
  const fields = parseFields(query.fields, ALL_FIELDS);

  const where = {};
  const idSets = []; // cada filtro relacional gera um conjunto de ids; o resultado é a interseção

  if (query.match !== undefined) {
    const term = requireString(query.match, 'match');
    where[Op.or] = [{ name: { [Op.like]: `%${term}%` } }, { description: { [Op.like]: `%${term}%` } }];
  }

  if (query['price-range'] !== undefined) {
    const m = String(query['price-range']).match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (!m || Number(m[1]) > Number(m[2])) throw HttpError.badRequest('Parâmetro "price-range" inválido');
    where.price = { [Op.between]: [Number(m[1]), Number(m[2])] };
  }

  if (query.category_ids !== undefined) {
    const categoryIds = parseIdList(query.category_ids, 'category_ids');
    const links = await ProductCategory.findAll({ where: { category_id: categoryIds } });
    idSets.push(new Set(links.map((l) => l.product_id)));
  }

  // ?option[45]=GG,PP  (parser "simple": a chave chega literalmente como "option[45]")
  for (const [key, raw] of Object.entries(query)) {
    if (!key.startsWith('option')) continue;
    const m = key.match(/^option\[(\d+)\]$/);
    if (!m || typeof raw !== 'string' || !raw.trim()) throw HttpError.badRequest('Parâmetro "option" inválido');

    const wanted = raw.split(',').map((v) => v.trim()).filter(Boolean);
    const rows = await ProductOption.findAll({ where: { id: Number(m[1]) } });
    const matches = rows.filter((o) => o.values.split(',').some((v) => wanted.includes(v)));
    idSets.push(new Set(matches.map((o) => o.product_id)));
  }

  if (idSets.length) {
    const [first, ...rest] = idSets;
    const ids = [...first].filter((id) => rest.every((s) => s.has(id)));
    if (!ids.length) return { data: [], total: 0, limit, page };
    where.id = ids;
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    order: [['id', 'ASC']],
    ...(limit !== -1 && { limit, offset }),
  });

  return { data: await buildProducts(rows, fields), total: count, limit, page };
}

async function getById(rawId) {
  const product = await Product.findByPk(parseId(rawId));
  if (!product) throw HttpError.notFound('Produto não encontrado');
  const [result] = await buildProducts([product], null);
  return result;
}

/* ------------------------------------------------------------------ */
/* Validação do payload                                                */
/* ------------------------------------------------------------------ */

function parseRadius(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  const m = typeof value === 'string' && value.trim().match(/^(\d+)(px)?$/);
  if (!m) throw HttpError.badRequest('Campo "radius" inválido');
  return Number(m[1]);
}

function parseOptionValues(item) {
  const raw = item.values ?? item.value; // o exemplo da especificação usa "value" e "values"
  if (
    !Array.isArray(raw) ||
    !raw.length ||
    raw.some((v) => typeof v !== 'string' || !v.trim() || v.includes(','))
  ) {
    throw HttpError.badRequest('O campo "values" da opção deve ser uma lista de textos (sem vírgulas)');
  }
  const values = raw.map((v) => v.trim());
  if (values.join(',').length > MAX_STRING) throw HttpError.badRequest('Valores da opção muito longos');
  return values;
}

function parseOptionFields(item, { partial }) {
  const out = {};
  const title = requireString(item.title, 'options.title', { required: !partial });
  if (title !== undefined) out.title = title;

  if (item.shape !== undefined) {
    if (!['square', 'circle'].includes(item.shape)) throw HttpError.badRequest('Campo "shape" inválido');
    out.shape = item.shape;
  }
  if (item.type !== undefined) {
    if (!['text', 'color'].includes(item.type)) throw HttpError.badRequest('Campo "type" inválido');
    out.type = item.type;
  }
  const radius = parseRadius(item.radius);
  if (radius !== undefined) out.radius = radius;

  if (!partial || item.values !== undefined || item.value !== undefined) {
    out.values = parseOptionValues(item).join(',');
  }
  return out;
}

/**
 * Valida e normaliza o payload. Na criação os campos obrigatórios são exigidos;
 * na atualização (PUT) apenas o que foi enviado é validado e alterado.
 */
async function validatePayload(body, { partial }) {
  if (!isPlainObject(body)) throw HttpError.badRequest();

  const data = {};
  const name = requireString(body.name, 'name', { required: !partial });
  const slug = requireString(body.slug, 'slug', { required: !partial });
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;

  const enabled = optionalBoolean(body.enabled, 'enabled');
  if (enabled !== undefined) data.enabled = enabled;
  const useInMenu = optionalBoolean(body.use_in_menu, 'use_in_menu');
  if (useInMenu !== undefined) data.use_in_menu = useInMenu;

  if (body.stock !== undefined) {
    if (!isInt(body.stock) || body.stock < 0) throw HttpError.badRequest('Campo "stock" inválido');
    data.stock = body.stock;
  }
  if (body.description !== undefined) {
    data.description = requireString(body.description, 'description', { required: false });
  }
  for (const field of ['price', 'price_with_discount']) {
    if (body[field] === undefined) {
      if (!partial) throw HttpError.badRequest(`O campo "${field}" é obrigatório`);
      continue;
    }
    if (!isNumber(body[field]) || body[field] < 0) throw HttpError.badRequest(`Campo "${field}" inválido`);
    data[field] = body[field];
  }

  let categoryIds;
  if (body.category_ids !== undefined) {
    if (!Array.isArray(body.category_ids) || body.category_ids.some((id) => !isInt(id) || id < 1)) {
      throw HttpError.badRequest('Campo "category_ids" inválido');
    }
    categoryIds = [...new Set(body.category_ids)];
    const found = await Category.count({ where: { id: categoryIds } });
    if (found !== categoryIds.length) throw HttpError.badRequest('Categoria inexistente em "category_ids"');
  }

  for (const key of ['images', 'options']) {
    if (body[key] !== undefined && (!Array.isArray(body[key]) || body[key].some((i) => !isPlainObject(i)))) {
      throw HttpError.badRequest(`Campo "${key}" inválido`);
    }
  }

  return { data, categoryIds, images: body.images, options: body.options };
}

/* ------------------------------------------------------------------ */
/* Criação                                                             */
/* ------------------------------------------------------------------ */

async function create(body) {
  const { data, categoryIds, images = [], options = [] } = await validatePayload(body, { partial: false });

  // valida tudo antes de tocar no banco / disco
  const decoded = images.map((img) => {
    if (img.id !== undefined || img.deleted) throw HttpError.badRequest('Imagem inválida na criação');
    return media.decodeImage(img.type, img.content);
  });
  const parsedOptions = options.map((o) => {
    if (o.id !== undefined || o.deleted) throw HttpError.badRequest('Opção inválida na criação');
    return parseOptionFields(o, { partial: false });
  });

  const written = [];
  try {
    const id = await sequelize.transaction(async (transaction) => {
      const product = await Product.create(data, { transaction });

      if (categoryIds?.length) {
        await ProductCategory.bulkCreate(
          categoryIds.map((category_id) => ({ product_id: product.id, category_id })),
          { transaction }
        );
      }
      for (const file of decoded) {
        const relative = await media.saveImage(product.id, file);
        written.push(relative);
        await ProductImage.create({ product_id: product.id, enabled: true, path: relative }, { transaction });
      }
      for (const option of parsedOptions) {
        await ProductOption.create({ ...option, product_id: product.id }, { transaction });
      }
      return product.id;
    });
    return getById(id);
  } catch (err) {
    await Promise.all(written.map((p) => media.removeImage(p)));
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Atualização                                                         */
/* ------------------------------------------------------------------ */

async function update(rawId, body) {
  const product = await Product.findByPk(parseId(rawId));
  if (!product) throw HttpError.notFound('Produto não encontrado');

  const { data, categoryIds, images, options } = await validatePayload(body, { partial: true });

  const existingImages = new Map((await ProductImage.findAll({ where: { product_id: product.id } })).map((i) => [i.id, i]));
  const existingOptions = new Map((await ProductOption.findAll({ where: { product_id: product.id } })).map((o) => [o.id, o]));

  // 1) valida e prepara todas as operações de imagem/opção
  const imageOps = (images || []).map((img) => {
    if (img.id !== undefined) {
      if (!isInt(img.id) || !existingImages.has(img.id)) throw HttpError.badRequest(`Imagem ${img.id} inexistente neste produto`);
      if (img.deleted === true) return { kind: 'delete', id: img.id };
      if (media.isRemoteUrl(img.content)) return { kind: 'keep' }; // já é a URL pública atual
      return { kind: 'replace', id: img.id, file: media.decodeImage(img.type, img.content) };
    }
    return { kind: 'create', file: media.decodeImage(img.type, img.content) };
  });

  const optionOps = (options || []).map((o) => {
    if (o.id !== undefined) {
      if (!isInt(o.id) || !existingOptions.has(o.id)) throw HttpError.badRequest(`Opção ${o.id} inexistente neste produto`);
      if (o.deleted === true) return { kind: 'delete', id: o.id };
      return { kind: 'update', id: o.id, fields: parseOptionFields(o, { partial: true }) };
    }
    return { kind: 'create', fields: parseOptionFields(o, { partial: false }) };
  });

  // 2) aplica tudo em uma transação
  const written = [];
  const toRemove = [];
  try {
    await sequelize.transaction(async (transaction) => {
      if (Object.keys(data).length) await product.update(data, { transaction });

      if (categoryIds) {
        await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
        await ProductCategory.bulkCreate(
          categoryIds.map((category_id) => ({ product_id: product.id, category_id })),
          { transaction }
        );
      }

      for (const op of imageOps) {
        if (op.kind === 'delete') {
          toRemove.push(existingImages.get(op.id).path);
          await ProductImage.destroy({ where: { id: op.id }, transaction });
        } else if (op.kind === 'replace') {
          const relative = await media.saveImage(product.id, op.file);
          written.push(relative);
          toRemove.push(existingImages.get(op.id).path);
          await ProductImage.update({ path: relative }, { where: { id: op.id }, transaction });
        } else if (op.kind === 'create') {
          const relative = await media.saveImage(product.id, op.file);
          written.push(relative);
          await ProductImage.create({ product_id: product.id, enabled: true, path: relative }, { transaction });
        }
      }

      for (const op of optionOps) {
        if (op.kind === 'delete') await ProductOption.destroy({ where: { id: op.id }, transaction });
        else if (op.kind === 'update') await ProductOption.update(op.fields, { where: { id: op.id }, transaction });
        else await ProductOption.create({ ...op.fields, product_id: product.id }, { transaction });
      }
    });
  } catch (err) {
    await Promise.all(written.map((p) => media.removeImage(p)));
    throw err;
  }

  // só apaga os arquivos antigos depois que o banco confirmou a mudança
  await Promise.all(toRemove.map((p) => media.removeImage(p)));
}

/* ------------------------------------------------------------------ */
/* Remoção                                                             */
/* ------------------------------------------------------------------ */

async function remove(rawId) {
  const product = await Product.findByPk(parseId(rawId));
  if (!product) throw HttpError.notFound('Produto não encontrado');

  await sequelize.transaction(async (transaction) => {
    await ProductImage.destroy({ where: { product_id: product.id }, transaction });
    await ProductOption.destroy({ where: { product_id: product.id }, transaction });
    await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
    await product.destroy({ transaction });
  });
  await media.removeProductFolder(product.id);
}

module.exports = { search, getById, create, update, remove };
