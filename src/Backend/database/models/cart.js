// cart.js

export default (sequelize, DataTypes) => {
    const Cart = sequelize.define(
      "Cart",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          unique: true,
        },
        accountId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "account", // Table name for Account
            key: "id",
          },
          onDelete: "CASCADE",
          validate: {
            isInt: {
              msg: "accountId must be an integer",
            },
          },
        },
        variationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "variations", // Table name for Variations
            key: "id",
          },
          onDelete: "CASCADE",
          validate: {
            isInt: {
              msg: "variationId must be an integer",
            },
          },
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          validate: {
            isInt: {
              msg: "Quantity must be an integer!",
            },
            min: {
              args: [1],
              msg: "Quantity must be at least 1!",
            },
          },
        },
        // Additional fields if you want (e.g. isPurchased, or a price snapshot, etc.)
        // isPurchased: {
        //   type: DataTypes.BOOLEAN,
        //   allowNull: false,
        //   defaultValue: false,
        // },
      },
      {
        sequelize,
        modelName: "Cart",
        tableName: "cart",
        // If you want Sequelize to automatically manage `createdAt` and `updatedAt`:
        timestamps: true,
        // If you'd rather control timestamp fields manually, comment out timestamps
        // and define your own fields like created_at, updated_at below.
        // timestamps: false,
      }
    );
  
    /**
     * ──────────────────────────────────────────────────────────
     * ASSOCIATE MODELS
     * ──────────────────────────────────────────────────────────
     *
     * This runs AFTER all models are loaded into Sequelize.
     * So you can reference `models.Account` and `models.Variations` here.
     */
    Cart.associate = (models) => {
      /**
       * Each cart item belongs to exactly one Account (the user).
       */
      Cart.belongsTo(models.Account, {
        foreignKey: "accountId",
        as: "account", // For easier query access (e.g. Cart.findAll({ include: "account" }))
      });
  
      /**
       * Each cart item references one Variation (a specific SKU of a product).
       */
      Cart.belongsTo(models.Variations, {
        foreignKey: "variationId",
        as: "variation",
      });
    };
  
    return Cart;
  };
  