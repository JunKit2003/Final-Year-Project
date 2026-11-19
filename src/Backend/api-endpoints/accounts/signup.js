import bcrypt from "bcrypt";
import {
  pingDatabase,
  DatabaseConnectionError,
  InputValidationError,
} from "../../database/utils.js";
import { db } from "../../database/index.js"; 

/**
 * Signup endpoint
 * Expected `req.body` fields:
 *  - username
 *  - email
 *  - password
 *  - first_name
 *  - last_name
 *  - phone_number
 *  (any `category` sent by the client is ignored: public signups are always customers)
 */
export default async function signup(req, res) {
  try {
    // 1. Extract form data
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      phone_number,
    } = req.body;
    // Never trust a role from the request body: admin accounts can't be self-created.
    const category = "Customer";

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

    // 3. Ping DB
    await pingDatabase();

    // 4. Check if username, email, or phone number is already taken
    const usernameExists = await db.Account.findOne({ where: { username } });
    if (usernameExists) {
      throw new InputValidationError("Username is already taken.");
    }

    const emailExists = await db.Account.findOne({ where: { email } });
    if (emailExists) {
      throw new InputValidationError("Email is already registered.");
    }

    const phoneNumberExists = await db.Account.findOne({ where: { phone_number } });
    if (phoneNumberExists) {
      throw new InputValidationError("Phone number is already registered.");
    }

    // 5. Hash the password
    // console.log("Signup - Plaintext Password:", password);
    const hashedPassword = await bcrypt.hash(password, 10);
    // console.log("Signup - Hashed Password:", hashedPassword);

    // 6. Create new user in DB
    const newUser = await db.Account.create({ 
      username,
      email,
      password: hashedPassword,
      first_name,
      last_name,
      phone_number,
      category,
    });

    // 7. **Do NOT** create a session here. Simply respond that signup was successful.
    return res.status(201).json({
      message: "Signup successful! Please login to continue.",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone_number: newUser.phone_number,
        category: newUser.category,
      },
    });
  } catch (error) {
    if (error instanceof InputValidationError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof DatabaseConnectionError) {
      return res.status(500).json({ message: "Unable to connect to the database!" });
    } else {
      console.error("Error during signup:", error);
      return res.status(500).json({
        message: "Internal server error.",
        error: error.message || error,
      });
    }
  }
}
