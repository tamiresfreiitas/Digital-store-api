// Popula o banco com os mesmos dados mockados do frontend.  npm run seed
const bcrypt = require('bcrypt');
const { sequelize, User, Category, Product, ProductCategory, ProductOption } = require('../src/models');

const categories = [
  ['Camisetas', 'camisetas'],
  ['Calças', 'calcas'],
  ['Bonés', 'bones'],
  ['Headphones', 'headphones'],
  ['Tênis', 'tenis'],
];

// [nome, índice da categoria]
const products = [
  ['K-Swiss V8 - Masculino', 4],
  ['Nike Air Max', 4],
  ['Adidas Ultraboost', 4],
  ['Puma RS-X', 4],
  ['Camiseta Drip', 0],
  ['Boné Street', 2],
  ['Calça Jogger', 1],
  ['Fone Beats', 3],
];

const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

(async () => {
  // as tabelas são criadas pelas migrations:  npm run db:migrate
  await sequelize.authenticate();
  await User.count().catch(() => {
    throw new Error('Tabelas não encontradas. Rode "npm run db:migrate" antes do seed.');
  });

  await User.findOrCreate({
    where: { email: 'admin@mail.com' },
    defaults: { firstname: 'Admin', surname: 'Store', password: await bcrypt.hash('123@123', 10) },
  });

  const cats = [];
  for (const [name, slug] of categories) {
    const [cat] = await Category.findOrCreate({ where: { slug }, defaults: { name, slug, use_in_menu: true } });
    cats.push(cat);
  }

  for (const [i, [name, catIndex]] of products.entries()) {
    const [product, created] = await Product.findOrCreate({
      where: { slug: slugify(name) },
      defaults: {
        name,
        slug: slugify(name),
        enabled: true,
        stock: 10,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        price: i % 2 === 0 ? 200 : 49.9 + i * 10,
        price_with_discount: i % 2 === 0 ? 149.9 : 0,
      },
    });
    if (!created) continue;
    await ProductCategory.create({ product_id: product.id, category_id: cats[catIndex].id });
    await ProductOption.bulkCreate([
      { product_id: product.id, title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: '39,40,41,42,43' },
      { product_id: product.id, title: 'Cor', shape: 'circle', type: 'color', values: '#6FEEFF,#FF6969,#5DE380,#D9D9D9' },
    ]);
  }

  console.log('Seed concluído. Usuário de teste: admin@mail.com / 123@123');
  await sequelize.close();
})().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
