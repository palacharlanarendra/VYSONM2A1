require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
  });
} else {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./sqlite.db",
    logging: false,
  });
}

const UrlShortner = sequelize.define(
  "UrlShortner",
  {
    original_url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    short_code: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "url_shortner",
    timestamps: true,
  }
);

module.exports = { sequelize, UrlShortner };
