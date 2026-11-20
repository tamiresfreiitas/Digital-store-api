const { app, request, sequelize, resetDb, createUserAndToken } = require('./helpers');

let auth;
beforeEach(async () => {
  await resetDb();
  ({ auth } = await createUserAndToken());
});
afterAll(() => sequelize.close());

const make = (n, use_in_menu = true) =>
  request(app).post('/v1/category').set(auth).send({ name: `Cat ${n}`, slug: `cat-${n}`, use_in_menu });

describe('CRUD de categorias', () => {
  it('cria (201), busca por id (200) e 404', async () => {
    const created = await make(1);
    expect(created.status).toBe(201);
    const res = await request(app).get(`/v1/category/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, name: 'Cat 1', slug: 'cat-1', use_in_menu: true });
    expect((await request(app).get('/v1/category/99')).status).toBe(404);
  });

  it('use_in_menu assume false por padrão', async () => {
    const res = await request(app).post('/v1/category').set(auth).send({ name: 'A', slug: 'a' });
    expect(res.body.use_in_menu).toBe(false);
  });

  it('POST: 401 sem token e 400 com dados inválidos', async () => {
    expect((await request(app).post('/v1/category').send({ name: 'A', slug: 'a' })).status).toBe(401);
    expect((await request(app).post('/v1/category').set(auth).send({ name: 'A' })).status).toBe(400);
    expect((await request(app).post('/v1/category').set(auth).send({ name: 'A', slug: 'a', use_in_menu: 'sim' })).status).toBe(400);
  });

  it('PUT: 204, 400, 401 e 404', async () => {
    await make(1);
    const body = { name: 'Novo', slug: 'novo', use_in_menu: false };
    expect((await request(app).put('/v1/category/1').set(auth).send(body)).status).toBe(204);
    expect((await request(app).get('/v1/category/1')).body).toMatchObject(body);
    expect((await request(app).put('/v1/category/1').set(auth).send({ name: '' })).status).toBe(400);
    expect((await request(app).put('/v1/category/1').send(body)).status).toBe(401);
    expect((await request(app).put('/v1/category/99').set(auth).send(body)).status).toBe(404);
  });

  it('DELETE: 204, 401 e 404', async () => {
    await make(1);
    expect((await request(app).delete('/v1/category/1')).status).toBe(401);
    expect((await request(app).delete('/v1/category/1').set(auth)).status).toBe(204);
    expect((await request(app).delete('/v1/category/1').set(auth)).status).toBe(404);
  });
});

describe('GET /v1/category/search', () => {
  beforeEach(async () => {
    for (let i = 1; i <= 15; i++) await make(i, i % 3 !== 0); // 3,6,9,12,15 fora do menu
  });

  it('usa limit=12 e page=1 por padrão', async () => {
    const res = await request(app).get('/v1/category/search');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 15, limit: 12, page: 1 });
    expect(res.body.data).toHaveLength(12);
  });

  it('pagina', async () => {
    const res = await request(app).get('/v1/category/search?limit=10&page=2');
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data[0].id).toBe(11);
  });

  it('limit=-1 retorna tudo', async () => {
    const res = await request(app).get('/v1/category/search?limit=-1');
    expect(res.body.data).toHaveLength(15);
    expect(res.body.limit).toBe(-1);
  });

  it('filtra por use_in_menu', async () => {
    const res = await request(app).get('/v1/category/search?limit=-1&use_in_menu=true');
    expect(res.body.total).toBe(10);
    expect(res.body.data.every((c) => c.use_in_menu === true)).toBe(true);
  });

  it('limita os campos', async () => {
    const res = await request(app).get('/v1/category/search?fields=name,slug&limit=1');
    expect(res.body.data[0]).toEqual({ name: 'Cat 1', slug: 'cat-1' });
  });

  it.each(['limit=0', 'limit=abc', 'page=0', 'page=x', 'fields=senha', 'use_in_menu=talvez'])(
    '400 para ?%s',
    async (qs) => {
      expect((await request(app).get(`/v1/category/search?${qs}`)).status).toBe(400);
    }
  );
});
