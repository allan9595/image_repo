'use strict';
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type:DataTypes.INTEGER,
      // references: {
      //   model: {
      //     tableName: "Users", //references as the foreign key 
      //   },
      //   key: 'id'
      // },
    },
    name: DataTypes.TEXT,
    productImageURL: DataTypes.STRING
  }, {
    freezeTableName: true,
  });
  Product.associate = function(models) {
    // associations can be defined here
    // Image.belongsTo(models.User, {
    //   foreignKey:'id',
    //   onDelete: 'CASCADE',
    //   onUpdate: 'CASCADE'
    // });
  };
  return Product;
};