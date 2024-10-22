// Importing Database Object
import { db } from "./index.js";

// Custom Error classes
class DatabaseError extends Error {
	constructor(message) {
		super(message);
		this.name = "DatabaseError";
	}
}

class DatabaseConnectionError extends DatabaseError {
	constructor() {
		super("Error connecting to the database!");
		this.name = "DatabaseConnectionError";
	}
}

class InputValidationError extends DatabaseError {
	constructor(message) {
		super(message);
		this.name = "InputValidationError";
	}
}

class ProductNotFoundError extends DatabaseError {
	constructor() {
		super("Product not found!");
		this.name = "ProductNotFoundError";
	}
}

class BannerNotFoundError extends DatabaseError {
	constructor() {
		super("Banner not found!");
		this.name = "BannerNotFoundError";
	}
}

class ProductExistsError extends DatabaseError {
	constructor() {
		super("Product already exists!");
		this.name = "ProductExistsError";
	}
}

class BannerExistsError extends DatabaseError {
	constructor() {
		super("Banner already exists!");
		this.name = "BannerExistsError";
	}
}

// Database Utility functions

async function pingDatabase() {
	try {
		await db.sequelize.authenticate();
		return true;
	} catch (error) {
		throw new DatabaseConnectionError();
	}
}

// Higher-order function for database connectivity check
function withDatabaseConnectivity(dbOperation) {
	return async (...args) => {
		await pingDatabase();
		return dbOperation(...args);
	};
}

// Wrapped Database Utility functions

// Product-related functions


// Retrieve product based on ID
const getProductFromDB = withDatabaseConnectivity(async (productId) => {
	try {
		// Fetch a single product by its ID
		const product = await db.Products.findOne({ where: { id: productId } });

		if (!product) {
			throw new ProductNotFoundError(`Product with ID ${productId} not found.`);
		}

		// Extract just the core data (dataValues)
		return product.get({ plain: true });
	} catch (error) {
		throw error;
	}
});


// Retrieve all products
const getProductsFromDB = withDatabaseConnectivity(async () => {
	try {
		// Fetch all products
		const products = await db.Products.findAll();

		if (!products.length) {
			throw new ProductNotFoundError();
		}

		// Extract just the core data (dataValues) from each product
		const plainProducts = products.map((product) =>
			product.get({ plain: true })
		);

		return plainProducts;
	} catch (error) {
		throw error;
	}
});

// Retrieve product categories
const getProductsCategoryFromDB = withDatabaseConnectivity(async () => {
	try {
		// Fetch distinct categories from the products table
		const categories = await db.Products.findAll({
			attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('category')), 'category']],
		});

		// Check if any categories were found
		if (!categories.length) {
			throw new Error("No categories found.");
		}

		// Extract plain category values
		const uniqueCategories = categories.map(category => category.get({ plain: true }).category);
		return uniqueCategories;
	} catch (error) {
		throw new DatabaseConnectionError("Failed to fetch product categories.");
	}
});


// Retrieve product brands
const getProductBrandsFromDB = withDatabaseConnectivity(async () => {
	try {
		// Fetch distinct brands from the products table
		const brands = await db.Products.findAll({
			attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('brand')), 'brand']],
		});

		// Check if any brands were found
		if (!brands.length) {
			throw new Error("No brands found.");
		}

		// Extract plain brand values
		const uniqueBrands = brands.map(brand => brand.get({ plain: true }).brand);
		return uniqueBrands;
	} catch (error) {
		throw new DatabaseConnectionError("Failed to fetch product brands.");
	}
});


// Add a new product
const addProductToDB = withDatabaseConnectivity(async (productDetails) => {
	try {
		const {
			category,
			name,
			brand,
			colors,
			price,
			description,
			image_folder_path,
			status,
		} = productDetails;

		// Check if product already exists
		const existingProduct = await db.Products.findOne({ where: { name } });

		if (existingProduct) {
			throw new ProductExistsError();
		}

		// Sort colors alphabetically
		const sortedColors = JSON.parse(colors).sort();

		await db.Products.create({
			category,
			name,
			brand,
			colors: sortedColors,
			price,
			description,
			image_folder_path,
			status,
		});
	} catch (error) {
		if (error instanceof db.Sequelize.ValidationError) {
			throw new InputValidationError(
				"Invalid input: " +
					error.errors.map((e) => e.message).join(", ")
			);
		} else {
			throw error;
		}
	}
});

// Update a product
const updateProductToDB = withDatabaseConnectivity(
	async (id, productDetails) => {
		try {
			const {
				category,
				name,
				brand,
				price,
				colors,
				description,
				image_folder_path,
				hasImageChanges,
				status,
			} = productDetails;

			const product = await db.Products.findByPk(id);
			if (!product) {
				throw new ProductNotFoundError();
			}

			// Sort colors alphabetically
			const sortedColors = JSON.parse(colors).sort();

			await product.update(
				{
					category,
					name,
					brand,
					colors: sortedColors,
					price,
					description,
					image_folder_path,
					status,
				},
				{
					hasImageChanges, // Pass hasImageChanges to control beforeUpdate behavior
				}
			);
		} catch (error) {
			if (error instanceof db.Sequelize.ValidationError) {
				throw new InputValidationError(
					"Invalid input: " +
						error.errors.map((e) => e.message).join(", ")
				);
			} else {
				throw error;
			}
		}
	}
);

// Delete a product
const deleteProductFromDB = withDatabaseConnectivity(async (id) => {
	try {
		const product = await db.Products.findByPk(id);
		if (!product) {
			throw new ProductNotFoundError();
		}

		await product.destroy();
	} catch (error) {
		throw error;
	}
});

// Banner-related functions

// Retrieve all banners
const getBannersFromDB = withDatabaseConnectivity(async () => {
	try {
		// Fetch all banners
		const banners = await db.BannerImage.findAll();

		if (!banners.length) {
			throw new BannerNotFoundError();
		}

		// Extract just the core data (dataValues) from each banner
		const plainBanners = banners.map((banner) =>
			banner.get({ plain: true })
		);

		return plainBanners;
	} catch (error) {
		throw error;
	}
});



// Add a new banner
const addBannerToDB = withDatabaseConnectivity(async (bannerDetails) => {
	try {
		const { directory } = bannerDetails;

		// Check if banner already exists (if required)
		const existingBanner = await db.BannerImage.findOne({ where: { directory } });

		if (existingBanner) {
			throw new BannerExistsError();
		}

		await db.BannerImage.create({
			directory,
		});
	} catch (error) {
		if (error instanceof db.Sequelize.ValidationError) {
			throw new InputValidationError(
				"Invalid input: " +
					error.errors.map((e) => e.message).join(", ")
			);
		} else {
			throw error;
		}
	}
});

// Update a banner
const updateBannerToDB = withDatabaseConnectivity(async (id, bannerDetails) => {
	try {
		const { directory } = bannerDetails;

		const banner = await db.BannerImage.findByPk(id);
		if (!banner) {
			throw new BannerNotFoundError();
		}

		await banner.update({
			directory,
		});
	} catch (error) {
		if (error instanceof db.Sequelize.ValidationError) {
			throw new InputValidationError(
				"Invalid input: " +
					error.errors.map((e) => e.message).join(", ")
			);
		} else {
			throw error;
		}
	}
});

// Delete a banner
const deleteBannerFromDB = withDatabaseConnectivity(async (id) => {
	try {
		const banner = await db.BannerImage.findByPk(id);
		if (!banner) {
			throw new BannerNotFoundError();
		}

		await banner.destroy();
		return banner;
	} catch (error) {
		throw error;
	}
});

// Get a banner by ID
const getBannerById = withDatabaseConnectivity(async (id) => {
    try {
        const banner = await db.BannerImage.findByPk(id);
        if (!banner) {
            throw new BannerNotFoundError();
        }
        return banner.get({ plain: true }); // Return the banner data as a plain object
    } catch (error) {
        throw error;
    }
});




const getUserByUsernameOrEmail = withDatabaseConnectivity(async (usernameOrEmail) => {
    try {
        const user = await db.Account.findOne({
            where: {
                [db.Sequelize.Op.or]: [
                    { username: usernameOrEmail },
                    { email: usernameOrEmail }
                ]
            }
        });

        if (!user) {
            throw new UserNotFoundError(); // Custom error if user is not found
        }

        return user.get({ plain: true });
    } catch (error) {
        throw error; // Re-throw the error for handling in the calling function
    }
});

// Export all errors and database utility functions as required
export {
    // Exporting product utility functions
    pingDatabase,
	getProductFromDB,
    getProductsFromDB,
    addProductToDB,
    updateProductToDB,
    deleteProductFromDB,
    getProductsCategoryFromDB,
    getProductBrandsFromDB,

    // Exporting banner utility functions
    getBannersFromDB,
    addBannerToDB,
    updateBannerToDB,
    deleteBannerFromDB,
    getBannerById,

    // // Exporting account utility functions
    getUserByUsernameOrEmail,  // Ensure this is only here once

    // Exporting error classes
    DatabaseError,
    DatabaseConnectionError,
    InputValidationError,
    ProductNotFoundError,
    ProductExistsError,
    BannerNotFoundError,
    BannerExistsError,
};

