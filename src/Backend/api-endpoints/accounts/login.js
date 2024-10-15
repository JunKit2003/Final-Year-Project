import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    getUserByUsernameOrEmail,  // Import the function here
} from "../../database/utils.js";
import bcrypt from "bcrypt"; // To hash and compare passwords

// Login function
export default async function login(req, res) {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password) {
            throw new InputValidationError("Email/Username and password are required.");
        }

        await pingDatabase();

        // Use the getUserByUsernameOrEmail function
        const user = await getUserByUsernameOrEmail(emailOrUsername);

        if (!user) {
            throw new InputValidationError("Invalid email/username or password.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new InputValidationError("Invalid email/username or password.");
        }

        // Save user info in session
        req.session.user = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            username: user.username,
            category: user.category,
        };

        // Send success response
        res.status(200).json({
            message: "Login successful!",
            user: req.session.user, // Return the session user data
        });
    } catch (error) {
        if (error instanceof InputValidationError) {
            return res.status(400).json({ message: error.message });
        } else if (error instanceof DatabaseConnectionError) {
            return res.status(500).json({ message: "Unable to connect to the database!" });
        } else {
            console.error("Error during login: ", error);
            res.status(500).send({ message: "Internal server error", error });
        }
    }
}
