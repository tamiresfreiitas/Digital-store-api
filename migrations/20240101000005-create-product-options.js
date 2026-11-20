'use strict';

/** Requisito 05 - tabela de opções do produto */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_options', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      title: { type: Sequelize.STRING, allowNull: false },
      shape: { type: Sequelize.ENUM('square', 'circle'), allowNull: true, defaultValue: 'square' },
      radius: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      type: { type: Sequelize.ENUM('text', 'color'), allowNull: true, defaultValue: 'text' },
      values: { type: Sequelize.STRING, allowNull: false }, // valores separados por vírgula
    });
    await queryInterface.addIndex('product_options', ['product_id'], { name: 'product_options_product_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_options');
  },
};
