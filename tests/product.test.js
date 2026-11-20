const fs = require('fs');
const path = require('path');
const { app, request, sequelize, resetDb, createUserAndToken, PNG } = require('./helpers');
const config = require('../src/config');

let auth;
beforeEach(async () => {
  await resetDb();
  ({ auth } = await createUserAndToken());
  for (const n of [1, 2, 3]) await request(app).post('/v1/category').set(auth).send({ name: `C${n}`, slug: `c${n}` });
});
afterAll(() => {
  fs.rmSync(config.mediaDir, { recursive: true, force: true });
  return sequelize.close();
});

const payload = (over = {}) => ({
  enabled: true,
  name: 'Produto 01',
  slug: 'produto-01',
  stock: 10,
  description: 'Descrição do produto 01',
  price: 119.9,
  price_with_discount: 99.9,
  category_ids: [1, 2],
  images: [{ type: 'image/png', content: PNG }, { type: 'image/jpg', content: PNG }],
  options: [
    { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', values: ['PP', 'GG', 'M'] },
    { title: 'Cor', shape: 'circle', type: 'color', values: ['#000', '#333'] },
  ],
  ...over,
});

const create = (over) => request(app).post('/v1/product').set(auth).send(payload(over));

describe('POST /v1/product', () => {
  it('cria produto completo (201) e grava as imagens em disco', async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 1, enabled: true, name: 'Produto 01', price: 119.9, price_with_discount: 99.9, category_ids: [1, 2],
    });
    expect(res.body.images).toHaveLength(2);
    expect(res.body.options[0]).toMatchObject({ title: 'Tamanho', radius: 4, values: ['PP', 'GG', 'M'] });

    const url = res.body.images[0].content;
    expect(url).toMatch(/\/media\/product-1\/.+\.png$/);
    const file = path.join(config.mediaDir, url.split('/media/')[1]);
    expect(fs.existsSync(file)).toBe(true);

    // a imagem fica acessível pelo servidor estático
    const img = await request(app).get(url.replace(config.baseUrl, ''));
    expect(img.status).toBe(200);
  });

  it('aplica os valores padrão', async () => {
    const res = await request(app).post('/v1/product').set(auth)
      .send({ name: 'X', slug: 'x', price: 10, price_with_discount: 0 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ enabled: false, stock: 0, category_ids: [], images: [], options: [] });
  });

  it('401 sem token', async () => {
    expect((await request(app).post('/v1/product').send(payload())).status).toBe(401);
  });

  it.each([
    ['sem name', { name: undefined }],
    ['sem slug', { slug: undefined }],
    ['sem price', { price: undefined }],
    ['sem price_with_discount', { price_with_discount: undefined }],
    ['price como texto', { price: '10' }],
    ['stock negativo', { stock: -1 }],
    ['categoria inexistente', { category_ids: [99] }],
    ['category_ids inválido', { category_ids: 'a' }],
    ['imagem com tipo inválido', { images: [{ type: 'image/bmp', content: PNG }] }],
    ['imagem com base64 inválido', { images: [{ type: 'image/png', content: '@@@' }] }],
    ['opção sem values', { options: [{ title: 'Cor' }] }],
    ['opção com shape inválido', { options: [{ title: 'Cor', shape: 'triangle', values: ['a'] }] }],
    ['opção com type inválido', { options: [{ title: 'Cor', type: 'x', values: ['a'] }] }],
  ])('400 %s', async (_, over) => {
    expect((await create(over)).status).toBe(400);
  });

  it('não deixa lixo no banco/disco quando falha', async () => {
    const res = await create({ options: [{ title: 'Cor', values: [] }] });
    expect(res.status).toBe(400);
    expect((await request(app).get('/v1/product/search')).body.total).toBe(0);
    expect(fs.existsSync(path.join(config.mediaDir, 'product-1'))).toBe(false);
  });
});

describe('GET /v1/product/:id', () => {
  it('200 e 404', async () => {
    await create();
    const res = await request(app).get('/v1/product/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Produto 01');
    expect(res.body.images[0]).toHaveProperty('content');
    expect((await request(app).get('/v1/product/99')).status).toBe(404);
  });
});

describe('GET /v1/product/search', () => {
  beforeEach(async () => {
    await create({ name: 'Tênis Nike', slug: 'tenis-nike', price: 200, category_ids: [1] });
    await create({
      name: 'Camiseta Drip', slug: 'camiseta', description: 'Algodão tênis', price: 50, category_ids: [2],
      options: [{ title: 'Tamanho', values: ['GG', 'M'] }],
    });
    await create({ name: 'Boné', slug: 'bone', price: 120, category_ids: [1, 3], options: [{ title: 'Tam', values: ['PP'] }] });
  });
  const search = (qs = '') => request(app).get(`/v1/product/search${qs}`);

  it('retorna paginação padrão', async () => {
    const res = await search();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, limit: 12, page: 1 });
    expect(res.body.data).toHaveLength(3);
  });

  it('limit/page e limit=-1', async () => {
    expect((await search('?limit=2&page=2')).body.data.map((p) => p.id)).toEqual([3]);
    expect((await search('?limit=-1')).body.data).toHaveLength(3);
  });

  it('fields', async () => {
    const res = await search('?fields=name,images,price&limit=1');
    expect(Object.keys(res.body.data[0])).toEqual(['name', 'images', 'price']);
  });

  it('match em nome ou descrição', async () => {
    expect((await search(`?match=${encodeURIComponent('Tênis')}`)).body.data.map((p) => p.id)).toEqual([1, 2]); // nome (1) e descrição (2)
    expect((await search('?match=Algod')).body.data.map((p) => p.id)).toEqual([2]);
    expect((await search('?match=inexistente')).body.total).toBe(0);
  });

  it('category_ids', async () => {
    expect((await search('?category_ids=1')).body.data.map((p) => p.id)).toEqual([1, 3]);
    expect((await search('?category_ids=2,3')).body.data.map((p) => p.id)).toEqual([2, 3]);
    expect((await search('?category_ids=99')).body.total).toBe(0);
  });

  it('price-range', async () => {
    expect((await search('?price-range=100-200')).body.data.map((p) => p.id)).toEqual([1, 3]);
  });

  it('option[id]=valores', async () => {
    // opções criadas: 1-2 (produto 1), 3 (produto 2), 4 (produto 3)... conferimos pelo id real
    const optId = (await search('?fields=options')).body.data[1].options[0].id;
    const res = await search(`?option[${optId}]=GG,PP`);
    expect(res.body.data.map((p) => p.id)).toEqual([2]);
    expect((await search(`?option[${optId}]=XL`)).body.total).toBe(0);
  });

  it('combina filtros', async () => {
    expect((await search('?category_ids=1&price-range=150-300')).body.data.map((p) => p.id)).toEqual([1]);
  });

  it.each(['limit=0', 'page=0', 'fields=x', 'category_ids=a', 'price-range=abc', 'price-range=200-100', 'option[x]=GG', 'option=GG', 'option[1]='])(
    '400 para ?%s',
    async (qs) => {
      expect((await search(`?${qs}`)).status).toBe(400);
    }
  );
});

describe('PUT /v1/product/:id', () => {
  it('atualiza campos, categorias, imagens e opções (204)', async () => {
    const before = (await create()).body;
    const [img1, img2] = before.images;
    const [opt1, opt2] = before.options;
    const oldFile = path.join(config.mediaDir, img2.content.split('/media/')[1]);

    const res = await request(app).put('/v1/product/1').set(auth).send({
      name: 'Atualizado', slug: 'atualizado', stock: 20, price: 49.9, price_with_discount: 0, category_ids: [3],
      images: [
        { type: 'image/png', content: PNG },                 // nova
        { id: img2.id, deleted: true },                      // removida
        { id: img1.id, content: img1.content },              // mantida (URL)
      ],
      options: [
        { id: opt1.id, deleted: true },
        { id: opt2.id, radius: '10px', values: ['A', 'B'] },
        { title: 'Tipo', shape: 'square', type: 'text', values: ['100% algodão'] },
      ],
    });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const after = (await request(app).get('/v1/product/1')).body;
    expect(after).toMatchObject({ name: 'Atualizado', stock: 20, price: 49.9, price_with_discount: 0, category_ids: [3] });
    expect(after.images).toHaveLength(2);
    expect(after.images.map((i) => i.id)).not.toContain(img2.id);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(after.options.map((o) => o.title)).toEqual(['Cor', 'Tipo']);
    expect(after.options[0]).toMatchObject({ radius: 10, values: ['A', 'B'] });
  });

  it('substitui o arquivo de uma imagem existente', async () => {
    const { images } = (await create()).body;
    await request(app).put('/v1/product/1').set(auth).send({ images: [{ id: images[0].id, type: 'image/png', content: PNG }] });
    const after = (await request(app).get('/v1/product/1')).body;
    expect(after.images[0].id).toBe(images[0].id);
    expect(after.images[0].content).not.toBe(images[0].content);
  });

  it('PUT parcial mantém o restante', async () => {
    await create();
    await request(app).put('/v1/product/1').set(auth).send({ stock: 3 });
    const p = (await request(app).get('/v1/product/1')).body;
    expect(p).toMatchObject({ name: 'Produto 01', stock: 3, category_ids: [1, 2] });
    expect(p.images).toHaveLength(2);
  });

  it('401, 404 e 400', async () => {
    await create();
    expect((await request(app).put('/v1/product/1').send({ stock: 1 })).status).toBe(401);
    expect((await request(app).put('/v1/product/99').set(auth).send({ stock: 1 })).status).toBe(404);
    expect((await request(app).put('/v1/product/1').set(auth).send({ price: 'x' })).status).toBe(400);
    expect((await request(app).put('/v1/product/1').set(auth).send({ images: [{ id: 999, deleted: true }] })).status).toBe(400);
    expect((await request(app).put('/v1/product/1').set(auth).send({ options: [{ id: 999, deleted: true }] })).status).toBe(400);
  });

  it('é atômico: erro na validação não altera nada', async () => {
    await create();
    const res = await request(app).put('/v1/product/1').set(auth).send({ name: 'Mudou', options: [{ id: 999, deleted: true }] });
    expect(res.status).toBe(400);
    expect((await request(app).get('/v1/product/1')).body.name).toBe('Produto 01');
  });
});

describe('DELETE /v1/product/:id', () => {
  it('remove produto, relações e arquivos (204)', async () => {
    await create();
    expect((await request(app).delete('/v1/product/1').set(auth)).status).toBe(204);
    expect((await request(app).get('/v1/product/1')).status).toBe(404);
    expect(fs.existsSync(path.join(config.mediaDir, 'product-1'))).toBe(false);
    const { ProductImage, ProductOption, ProductCategory } = require('../src/models');
    expect(await ProductImage.count()).toBe(0);
    expect(await ProductOption.count()).toBe(0);
    expect(await ProductCategory.count()).toBe(0);
  });

  it('401 e 404', async () => {
    await create();
    expect((await request(app).delete('/v1/product/1')).status).toBe(401);
    expect((await request(app).delete('/v1/product/99').set(auth)).status).toBe(404);
  });
});

describe('Rotas inexistentes', () => {
  it('404', async () => {
    expect((await request(app).get('/v1/nada')).status).toBe(404);
  });
});
