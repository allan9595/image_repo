'use strict';
module.exports = (sequelize, DataTypes) => {
  const Image = sequelize.define('Image', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type:DataTypes.INTEGER,
      references: {
        model: User,
        key: 'id'
      },
    },
    name: DataTypes.TEXT,
    data: DataTypes.BLOB
  }, {});
  Image.associate = function(models) {
    // associations can be defined here
    Image.belongsTo(models.User, {
      foreignKey:'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };
  return Image;
};