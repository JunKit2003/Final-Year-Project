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
					password:
						"$2a$12$d9Z8XOEQ8pv6gJvp0Mvlyu139DvYFE49ItQ817K67MFwOOtabKI1a", // abcd1234
				},
			]);
		}

		// Check if products table is empty
		// const productCount = await db.Products.count();
		// if (productCount === 0) {
		// 	await db.Products.bulkCreate([
		// 		{
		// 			category: "Mountain Bike",
		// 			name: "Trek Marlin 7",
		// 			brand: "Trek",
		// 			price: 899.99,
		// 			description:
		// 				"A versatile hardtail mountain bike perfect for light trails.",
		// 			variations: ["Black", "Blue", "Red"],
		// 			image_folder_path: "N/A",
		// 		},
				
		// 	]);
		// }

		// Check if banner_image table is empty
		// const banner_imageCount = await db.BannerImage.count();
		// if (banner_imageCount === 0) { // Corrected this line
		// 	await db.BannerImage.bulkCreate([
		// 		{
		// 			id: 1,
		// 			directory: "abcde"
		// 		},
		// 	]);
		// }


		console.log("Database initialization completed successfully!");
	} catch (error) {
		console.error("Error during initialization: ", error);
	}
};

export { initializeDatabase };
