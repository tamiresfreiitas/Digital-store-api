const { app, request, sequelize } = require('./helpers');

afterAll(() => sequelize.close());

describe('Documentação Swagger', () => {
  it('serve a UI em /api-docs', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('serve a especificação OpenAPI com todos os endpoints do enunciado', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);

    const documented = Object.entries(res.body.paths).flatMap(([path, ops]) =>
      Object.keys(ops).map((method) => `${method.toUpperCase()} ${path}`)
    );
    const expected = [
      'POST /user/token', 'POST /user', 'GET /user/{id}', 'PUT /user/{id}', 'DELETE /user/{id}',
      'GET /category/search', 'GET /category/{id}', 'POST /category', 'PUT /category/{id}', 'DELETE /category/{id}',
      'GET /product/search', 'GET /product/{id}', 'POST /product', 'PUT /product/{id}', 'DELETE /product/{id}',
    ];
    expect(documented.sort()).toEqual(expected.sort());
  });

  it('marca como protegidos todos os POST/PUT/DELETE (exceto cadastro e token)', async () => {
    const { body } = await request(app).get('/api-docs.json');
    for (const [path, ops] of Object.entries(body.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const open = path === '/user' || path === '/user/token';
        const mutating = ['post', 'put', 'delete'].includes(method);
        expect(Boolean(op.security)).toBe(mutating && !open);
      }
    }
  });
});
