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
    },
    short_code: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
    click_count: {
      type: DataTypes.STRING,
      default: 0,
    },
    last_accessed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "url_shortner",
    timestamps: true,
  }
);

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    optional: true
  },
  api_key: {
    type: DataTypes.STRING,
    unique: true
  },
},
{
  tableName: "user"
}
);

UrlShortner.belongsTo(User, { foreignKey: "user_id" });

module.exports = { sequelize, UrlShortner, User };
