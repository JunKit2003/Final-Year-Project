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
					first_name: "Kevin",
					last_name: "Lee",
					username: "factionadmin",
					email: "factionbikeworks@faction.com",
					phone_number: "01133321767",
					password:
						"$2a$10$xitLFMrWUHnBhjU1pyZXcOWmsND2rGM/XuQnHI6IA9C4Ggdp8WHTi", //faction$$$$$
				},
			]);
		}



		console.log("Database initialization completed successfully!");
	} catch (error) {
		console.error("Error during initialization: ", error);
	}
};

export { initializeDatabase };
