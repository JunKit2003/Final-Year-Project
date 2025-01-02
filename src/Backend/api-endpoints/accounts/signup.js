import bcrypt from "bcrypt";
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
} from "../../database/utils.js";

import { db } from "../../database/index.js"; // Or wherever your sequelize instance is exported

/**
 * Signup endpoint
 * Expected `req.body` fields:
 *  - username
 *  - email
 *  - password
 *  - first_name
 *  - last_name
 *  - phone_number
 *  - category (default: customer)
 */
export default async function signup(req, res) {
  try {
    // 1. Extract form data from the request body
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      phone_number,
      category = "customer", // default to "customer" (or whatever you need)
    } = req.body;

    // 2. Validate input - All fields are mandatory
    if (
      !username ||
      !email ||
      !password ||
      !first_name ||
      !last_name ||
      !phone_number
    ) {
      throw new InputValidationError(
        "First name, Last name, Username, Email, Password, and Phone number are required."
      );
    }

    // 3. Ping the DB to ensure connectivity
    await pingDatabase();

    // 4. Check if username already exists
    const usernameExists = await db.Account.findOne({
      where: { username },
    });
    if (usernameExists) {
      throw new InputValidationError("Username is already taken.");
    }

    // 5. Check if email already exists
    const emailExists = await db.Account.findOne({
      where: { email },
    });
    if (emailExists) {
      throw new InputValidationError("Email is already registered.");
    }

    // 6. Check if phone number already exists
    const phoneNumberExists = await db.Account.findOne({
      where: { phone_number },
    });
    if (phoneNumberExists) {
      throw new InputValidationError("Phone number is already registered.");
    }

    // 7. Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create the new user record in the database
    const newUser = await db.Account.create({
      username,
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone_number,
      category,
    });

    // 9. Store user info in session (exclude password)
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      phone_number: newUser.phone_number,
      category: newUser.category,
    };

    // 10. Save the session
    req.session.save();

    // 11. Return success response to client
    return res.status(201).json({
      message: "Signup successful!",
      user: req.session.user,
    });
  } catch (error) {
    if (error instanceof InputValidationError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof DatabaseConnectionError) {
      return res
        .status(500)
        .json({ message: "Unable to connect to the database!" });
    } else {
      console.error("Error during signup:", error);
      return res.status(500).json({
        message: "Internal server error.",
        error: error.message || error,
      });
    }
  }
}
