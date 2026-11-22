// orderItem.js

export default (sequelize, DataTypes) => {
    const OrderItem = sequelize.define(
      "OrderItem",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          unique: true,
        },
        orderId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "orders", // Table name for Orders
            key: "id",
          },
          onDelete: "CASCADE",
          validate: {
            isInt: {
              msg: "orderId must be an integer",
            },
          },
        },
        // Nullable and SET NULL: deleting a variation must never erase order history.
        // The snapshot columns below keep what was bought.
        variationId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: "variations", // Table name for Variations
            key: "id",
          },
          onDelete: "SET NULL",
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
        productName: { type: DataTypes.STRING, allowNull: true },
        variationName: { type: DataTypes.STRING, allowNull: true },
        sku: { type: DataTypes.STRING, allowNull: true },
        // Unit price at the time of purchase.
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            isDecimal: {
              msg: "Price must be a decimal value",
            },
            min: {
              args: [0],
              msg: "Price must be at least 0",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "OrderItem",
        tableName: "order_items",
        timestamps: true, // Automatically manage `createdAt` and `updatedAt`
      }
    );
  
    /**
     * ──────────────────────────────────────────────────────────
     * ASSOCIATE MODELS
     * ──────────────────────────────────────────────────────────
     *
     * Define relationships with other models.
     */
    OrderItem.associate = (models) => {
      /**
       * Each OrderItem belongs to exactly one Order.
       */
      OrderItem.belongsTo(models.Order, {
        foreignKey: "orderId",
        as: "order",
      });
  
      /**
       * Each OrderItem references one Variation (a specific SKU of a product).
       */
      OrderItem.belongsTo(models.Variations, {
        foreignKey: "variationId",
        as: "variation",
      });
    };
  
    return OrderItem;
  };
  