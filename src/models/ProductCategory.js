const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductCategory = sequelize.define(
  'ProductCategory',
  {
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE',
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: { model: 'categories', key: 'id' },
      onDelete: 'CASCADE',
    },
  },
  { tableName: 'product_categories', timestamps: false }
);

module.exports = ProductCategory;
