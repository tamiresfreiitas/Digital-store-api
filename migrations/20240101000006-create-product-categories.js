'use strict';

/** Requisito 06 - tabela de ligação entre produtos e categorias */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_categories', {
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'categories', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    });
    // a PK composta cobre buscas por product_id; este índice cobre buscas por category_id (?category_ids=)
    await queryInterface.addIndex('product_categories', ['category_id'], { name: 'product_categories_category_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_categories');
  },
};
