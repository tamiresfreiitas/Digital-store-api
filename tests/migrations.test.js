const { sequelize, resetDb } = require('./helpers');

beforeAll(resetDb);
afterAll(() => sequelize.close());

describe('Migrations', () => {
  it('criam as 6 tabelas do enunciado', async () => {
    const tables = (await sequelize.getQueryInterface().showAllTables()).map((t) => (t.tableName || t).toLowerCase());
    for (const t of ['users', 'categories', 'products', 'product_images', 'product_options', 'product_categories']) {
      expect(tables).toContain(t);
    }
  });

  it('criam created_at/updated_at em users, categories e products', async () => {
    const qi = sequelize.getQueryInterface();
    for (const t of ['users', 'categories', 'products']) {
      const cols = Object.keys(await qi.describeTable(t));
      expect(cols).toEqual(expect.arrayContaining(['created_at', 'updated_at']));
    }
  });

  it('aplicam os valores padrão exigidos (enabled/use_in_menu/stock = 0, shape square, type text, radius 0)', async () => {
    const qi = sequelize.getQueryInterface();
    const norm = (v) => String(v).replace(/'/g, '');
    const products = await qi.describeTable('products');
    expect(norm(products.enabled.defaultValue)).toMatch(/^(0|false)$/i);
    expect(norm(products.use_in_menu.defaultValue)).toMatch(/^(0|false)$/i);
    expect(norm(products.stock.defaultValue)).toBe('0');
    const options = await qi.describeTable('product_options');
    expect(norm(options.shape.defaultValue)).toBe('square');
    expect(norm(options.type.defaultValue)).toBe('text');
    expect(norm(options.radius.defaultValue)).toBe('0');
  });

  it('impedem imagem/opção/vínculo apontando para produto inexistente (chave estrangeira)', async () => {
    await expect(
      sequelize.query("INSERT INTO product_images (product_id, enabled, path) VALUES (999, 1, 'x.png')")
    ).rejects.toThrow();
    await expect(
      sequelize.query("INSERT INTO product_categories (product_id, category_id) VALUES (999, 999)")
    ).rejects.toThrow();
  });
});
