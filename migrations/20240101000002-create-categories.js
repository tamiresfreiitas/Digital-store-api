'use strict';

/** Requisito 02 - tabela de categorias */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false },
      use_in_menu: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    // a listagem filtra por use_in_menu
    await queryInterface.addIndex('categories', ['use_in_menu'], { name: 'categories_use_in_menu_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('categories');
  },
};
