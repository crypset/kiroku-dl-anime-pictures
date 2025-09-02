const { DataTypes } = require("sequelize");
const sequelize = require("../sqlite/sqlite_db");

const Downloaded_Image = sequelize.define("Downloaded_Image", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  imageId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: "image_id",
  },
  searchName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: "search_name",
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: "file_name",
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: "file_path",
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "file_size",
  },
  downloadUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: "download_url",
  },
  md5Hash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "md5_hash",
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  downloadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: "downloaded_at",
  },
  status: {
    type: DataTypes.ENUM("downloaded", "failed", "skipped"),
    defaultValue: "downloaded",
  },
});

module.exports = Downloaded_Image;
