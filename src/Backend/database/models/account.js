// Sequalize model for the accounts table

import bcrypt from 'bcrypt';
import { snakeCaseToNormalCase } from '../../utils.js';
import { ValidationError } from 'sequelize';

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
            throw new Error("First name must be at least 2 characters long and only contain letters and periods.");
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
            throw new Error("Last name must be at least 2 characters long and only contain letters and periods.");
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
      allowNull: true, // Optional, set `false` if mandatory
      validate: {
        isValidPhoneNumber(value) {
          if (value && !/^\+?\d{10,15}$/.test(value)) {
            throw new Error("Phone number must be valid (10-15 digits, optional + prefix).");
          }
        },
      },
    },
    password: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Password must not be empty!" },
        isValidPassword(value) {
          // Check length
          if (value.length < 6) {
            throw new Error("Password must be at least 6 characters long!");
          }
        
          // Check for at least one uppercase letter
          if (!/[A-Z]/.test(value)) {
            throw new Error("Password must contain at least one uppercase letter!");
          }
        
          // Check for at least one lowercase letter
          if (!/[a-z]/.test(value)) {
            throw new Error("Password must contain at least one lowercase letter!");
          }
        
          // Check for at least one digit
          if (!/[0-9]/.test(value)) {
            throw new Error("Password must contain at least one number!");
          }
        
          // Check for at least one special character
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
            throw new Error("Password must contain at least one special character!");
          }
        },
      },
    },
    password_reset_token: {
      type: DataTypes.UUID,
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
    for (const key of options.fields) {
      const oldValue = account.previous(key);
      const newValue = account.getDataValue(key);
      
        if (key === 'password') {
          // Check if the new plaintext password is the same as the old hashed password
          const passwordIsUnchanged = await bcrypt.compare(newValue, oldValue);
          if (passwordIsUnchanged) {
            throw new ValidationError('New password must be different from the old password!', [
              { message: 'New password must be different from the old password!' }
            ]);
            
          }

        // Hash the password before saving
        account.password = await bcrypt.hash(newValue, saltRounds);
      }
      
      else if (newValue === oldValue) {
          throw new ValidationError(`${key} is unchanged!`, [{message: `${snakeCaseToNormalCase(key)} is unchanged!`}]);
        }
    }
  });
  return Account;
};