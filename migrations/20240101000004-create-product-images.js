'use strict';

/** Requisito 04 - tabela de imagens do produto */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_images', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      enabled: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      path: { type: Sequelize.STRING, allowNull: false }, // caminho relativo no servidor
    });
    await queryInterface.addIndex('product_images', ['product_id'], { name: 'product_images_product_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_images');
  },
};
