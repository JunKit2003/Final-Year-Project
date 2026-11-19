import { db } from "./index.js";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

// First admin on an empty database. ADMIN_INITIAL_PASSWORD sets it; otherwise a random one
// is generated and printed once to the logs. (It used to be a fixed, public "admin".)
const initialAdminPassword = () => {
	const fromEnv = process.env.ADMIN_INITIAL_PASSWORD;
	if (fromEnv) return { password: fromEnv, generated: false };
	return { password: randomBytes(15).toString("base64url"), generated: true };
};

const initializeDatabase = async () => {
	try {
		// Check if users table is empty
		const accountCount = await db.Account.count();
		if (accountCount === 0) {
			const { password, generated } = initialAdminPassword();
			const adminHash = await bcrypt.hash(password, 10);
			await db.Account.bulkCreate([
				{
					id: 1,
					category: "Admin",
					first_name: "Admin",
					last_name: "Admin",
					username: "Admin",
					// A real inbox lets the admin use "Forgot password".
					email: process.env.ADMIN_EMAIL || "Admin@admin.com",
					phone_number: "01234567890",
					password: adminHash,
				},
			]);
			if (generated) {
				console.log(`Created admin account "Admin" with a generated password: ${password}`);
				console.log("Change it with deploy/set-admin-password.sh, or set ADMIN_INITIAL_PASSWORD before first start.");
			} else {
				console.log('Created admin account "Admin" with ADMIN_INITIAL_PASSWORD.');
			}
		}



		console.log("Database initialization completed successfully!");
	} catch (error) {
		console.error("Error during initialization: ", error);
	}
};

export { initializeDatabase };
