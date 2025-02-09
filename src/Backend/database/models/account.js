import bcrypt from 'bcrypt';
import { snakeCaseToNormalCase } from '../../utils.js';
import { ValidationError } from 'sequelize';

const saltRounds = 10; // Define your salt rounds

export default (sequelize, DataTypes) => {
  const Account = sequelize.define('Account', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Account ID must be unique!'
      },
    },
    category: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Category must not be empty!" },
      },
    },
    first_name: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "First name must not be empty!" },
        isValidName(value) {
          if (value.length < 2 || !/^[a-zA-Z.]+(?: [a-zA-Z.]+)*$/.test(value)) {
            throw new Error(
              "First name must be at least 2 characters and only contain letters/periods."
            );
          }
        },
      },
    },
    last_name: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Last name must not be empty!" },
        isValidName(value) {
          if (value.length < 2 || !/^[a-zA-Z.]+(?: [a-zA-Z.]+)*$/.test(value)) {
            throw new Error(
              "Last name must be at least 2 characters and only contain letters/periods."
            );
          }
        },
      },
    },
    username: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: {
        args: true,
        msg: 'Username must be unique!'
      },
      validate: {
        notEmpty: { msg: "Username must not be empty!" },
        isValidUsernameLength(value) {
          if (value.length < 3) {
            throw new Error("Username must be at least 3 characters long!");
          }
        },
      },
    },
    email: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: {
        args: true,
        msg: 'Email must be unique!'
      },
      validate: {
        isEmail: { msg: "Must be a valid email address!" },
        notEmpty: { msg: "Email must not be empty!" },
      },
    },
    phone_number: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        isValidPhoneNumber(value) {
          if (value && !/^\+?\d{10,15}$/.test(value)) {
            throw new Error(
              "Phone number must be valid (10-15 digits, optional +)."
            );
          }
        },
      },
    },
    password: {
      type: DataTypes.STRING(255), // Changed from TEXT to VARCHAR(255)
      allowNull: false,
      validate: {
        notEmpty: { msg: "Password must not be empty!" },
        isValidPassword(value) {
          if (value.length < 6) {
            throw new Error("Password must be at least 6 characters long!");
          }
          if (!/[A-Z]/.test(value)) {
            throw new Error("Password must contain at least one uppercase letter!");
          }
          if (!/[a-z]/.test(value)) {
            throw new Error("Password must contain at least one lowercase letter!");
          }
          if (!/[0-9]/.test(value)) {
            throw new Error("Password must contain at least one number!");
          }
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            throw new Error("Password must contain at least one special character!");
          }
        },
      },
    },
    // Use STRING(64) or bigger for hex tokens
    password_reset_token: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    password_reset_token_expiration: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Account',
    tableName: 'account',
  });

  Account.beforeUpdate(async (account, options) => {
    if (options.fields.includes('password')) {
      const oldPasswordHash = account.previous('password'); // Old hashed password
      const newPassword = account.getDataValue('password'); // Already hashed!
  
      // Ensure new password is different from old password
      const passwordIsUnchanged = await bcrypt.compare(newPassword, oldPasswordHash);
      if (passwordIsUnchanged) {
        throw new ValidationError(
          'New password must be different from the old password!',
          [{ message: 'New password must be different from the old password!' }]
        );
      }
  
      // ✅ Do not rehash the password, as it's already hashed in signup/resetPassword.js
    }
  });

  return Account;
};
