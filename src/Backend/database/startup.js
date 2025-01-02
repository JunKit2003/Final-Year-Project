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
					first_name: "Jun Kit",
					last_name: "Chee",
					username: "Cjk@2003",
					email: "cjk@gmail.com",
					phone_number: "0172335460",
					password:
						"$2a$12$d9Z8XOEQ8pv6gJvp0Mvlyu139DvYFE49ItQ817K67MFwOOtabKI1a", // abcd1234
				},
			]);
		}



		console.log("Database initialization completed successfully!");
	} catch (error) {
		console.error("Error during initialization: ", error);
	}
};

export { initializeDatabase };
