// order.js

export default (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        unique: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "account", // Table name for Account
          key: "id",
        },
        onDelete: "CASCADE",
        validate: {
          isInt: {
            msg: "userId must be an integer",
          },
        },
      },

      // NEW FIELD: Recipient Name
      recipientName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Recipient name cannot be empty",
          },
        },
        // optionally, if you prefer snake_case in your DB table:
        // field: "recipient_name",
      },

      shippingAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Shipping address cannot be empty",
          },
        },
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: {
            msg: "Total amount must be a decimal value",
          },
          min: {
            args: [0],
            msg: "Total amount must be at least 0",
          },
        },
      },
      status: {
        type: DataTypes.ENUM("Pending", "Paid", "Shipped", "Completed", "Cancelled"),
        defaultValue: "Pending",
        allowNull: false,
        validate: {
          isIn: {
            args: [["Pending", "Paid", "Shipped", "Completed", "Cancelled"]],
            msg: "Invalid status value",
          },
        },
      },
    },
    {
      sequelize,
      modelName: "Order",
      tableName: "orders",
      timestamps: true, // Automatically manage `createdAt` and `updatedAt`
    }
  );

  // Associations
  Order.associate = (models) => {
    // 1) Each Order belongs to exactly one User (Account).
    Order.belongsTo(models.Account, {
      foreignKey: "userId",
      as: "user",
    });

    // 2) Each Order can have many OrderItems.
    Order.hasMany(models.OrderItem, {
      foreignKey: "orderId",
      as: "items",
      onDelete: "CASCADE",
    });
  };

  return Order;
};
