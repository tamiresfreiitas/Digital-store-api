const { app, request, sequelize, resetDb, createUserAndToken } = require('./helpers');

const valid = { firstname: 'Ana', surname: 'Silva', email: 'ana@mail.com', password: '123@123', confirmPassword: '123@123' };

beforeEach(resetDb);
afterAll(() => sequelize.close());

describe('POST /v1/user', () => {
  it('cadastra usuário (201) sem expor a senha', async () => {
    const res = await request(app).post('/v1/user').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, firstname: 'Ana', surname: 'Silva', email: 'ana@mail.com' });
  });

  it('salva a senha como hash bcrypt', async () => {
    await request(app).post('/v1/user').send(valid);
    const { User } = require('../src/models');
    const user = await User.findByPk(1);
    expect(user.password).not.toBe('123@123');
    expect(user.password).toMatch(/^\$2[aby]\$/);
  });

  it.each([
    ['sem firstname', { firstname: undefined }],
    ['sem surname', { surname: '' }],
    ['e-mail inválido', { email: 'nao-e-email' }],
    ['sem senha', { password: undefined, confirmPassword: undefined }],
    ['senhas diferentes', { confirmPassword: 'outra' }],
  ])('retorna 400 %s', async (_, patch) => {
    const res = await request(app).post('/v1/user').send({ ...valid, ...patch });
    expect(res.status).toBe(400);
  });

  it('retorna 400 para e-mail duplicado', async () => {
    await request(app).post('/v1/user').send(valid);
    const res = await request(app).post('/v1/user').send(valid);
    expect(res.status).toBe(400);
  });

  it('retorna 400 para JSON malformado', async () => {
    const res = await request(app).post('/v1/user').set('Content-Type', 'application/json').send('{ruim');
    expect(res.status).toBe(400);
  });
});

describe('GET /v1/user/:id', () => {
  it('retorna 200 com os dados', async () => {
    const { user } = await createUserAndToken();
    const res = await request(app).get(`/v1/user/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: user.id, firstname: 'User', surname: 'Test', email: 'user@mail.com' });
  });

  it('retorna 404 se não existir', async () => {
    expect((await request(app).get('/v1/user/999')).status).toBe(404);
    expect((await request(app).get('/v1/user/abc')).status).toBe(404);
  });
});

describe('PUT /v1/user/:id', () => {
  const patch = { firstname: 'Novo', surname: 'Nome', email: 'novo@mail.com' };

  it('atualiza (204, sem corpo)', async () => {
    const { user, auth } = await createUserAndToken();
    const res = await request(app).put(`/v1/user/${user.id}`).set(auth).send(patch);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get(`/v1/user/${user.id}`)).body.email).toBe('novo@mail.com');
  });

  it('401 sem token / token inválido', async () => {
    const { user } = await createUserAndToken();
    expect((await request(app).put(`/v1/user/${user.id}`).send(patch)).status).toBe(401);
    expect((await request(app).put(`/v1/user/${user.id}`).set('Authorization', 'Bearer xxx').send(patch)).status).toBe(401);
  });

  it('400 com dados incorretos', async () => {
    const { user, auth } = await createUserAndToken();
    const res = await request(app).put(`/v1/user/${user.id}`).set(auth).send({ ...patch, email: 'x' });
    expect(res.status).toBe(400);
  });

  it('404 se não existir', async () => {
    const { auth } = await createUserAndToken();
    expect((await request(app).put('/v1/user/999').set(auth).send(patch)).status).toBe(404);
  });
});

describe('DELETE /v1/user/:id', () => {
  it('remove (204)', async () => {
    const { user, auth } = await createUserAndToken();
    expect((await request(app).delete(`/v1/user/${user.id}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/v1/user/${user.id}`)).status).toBe(404);
  });

  it('401 sem token e 404 se não existir', async () => {
    const { user, auth } = await createUserAndToken();
    expect((await request(app).delete(`/v1/user/${user.id}`)).status).toBe(401);
    expect((await request(app).delete('/v1/user/999').set(auth)).status).toBe(404);
  });
});

describe('POST /v1/user/token', () => {
  it('retorna 200 com o JWT', async () => {
    await request(app).post('/v1/user').send(valid);
    const res = await request(app).post('/v1/user/token').send({ email: 'ana@mail.com', password: '123@123' });
    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('400 com senha errada, usuário inexistente ou payload vazio', async () => {
    await request(app).post('/v1/user').send(valid);
    expect((await request(app).post('/v1/user/token').send({ email: 'ana@mail.com', password: 'errada' })).status).toBe(400);
    expect((await request(app).post('/v1/user/token').send({ email: 'x@mail.com', password: '123@123' })).status).toBe(400);
    expect((await request(app).post('/v1/user/token').send({})).status).toBe(400);
  });
});
