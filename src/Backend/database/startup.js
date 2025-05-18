import { db } from "./index.js";

const initializeDatabase = async () => {
	try {
		// Check if users table is empty
		const accountCount = await db.Account.count();
		if (accountCount === 0) {
			await db.Account.bulkCreate([
				{
					id: 1,
					category: "Admin",
					first_name: "Admin",
					last_name: "Admin",
					username: "Admin",
					email: "Admin@admin.com",
					phone_number: "01234567890",
					password:
						"$2a$10$Xr3yGiMcK8b9yi23.KUwoOZFUBA4iMXt7fT/sN0nJ9..h1DhxBYXK", //admin
				},
			]);
		}



		console.log("Database initialization completed successfully!");
	} catch (error) {
		console.error("Error during initialization: ", error);
	}
};

export { initializeDatabase };
