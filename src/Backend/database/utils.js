// Importing Database Object
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// or if you prefer the promise version explicitly:
// import { promises as fsPromises } from 'fs';
// const { rm } = fsPromises;

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

class UserNotFoundError extends DatabaseError {
    constructor() {
        super("User not found!");
        this.name = "UserNotFoundError";
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
	  // Fetch a single product by its ID, including variations
	  const product = await db.Products.findOne({
		where: { id: productId },
		include: [{ model: db.Variations, as: "variations", where: { archivedAt: null }, required: false }],
		order: [[{ model: db.Variations, as: "variations" }, "position", "ASC"], [{ model: db.Variations, as: "variations" }, "id", "ASC"]],
	  });
  
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
	  // Fetch all products, including variations
	  // Shoppers only see live products and variants that haven't been archived.
	  const products = await db.Products.findAll({
		where: { status: "live" },
		include: [{ model: db.Variations, as: "variations", where: { archivedAt: null }, required: false }],
		order: [["id", "ASC"], [{ model: db.Variations, as: "variations" }, "position", "ASC"], [{ model: db.Variations, as: "variations" }, "id", "ASC"]],
	  });
  
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
		attributes: [
		  [db.Sequelize.fn("DISTINCT", db.Sequelize.col("category")), "category"],
		],
	  });
  
	  // Check if any categories were found
	  if (!categories.length) {
		throw new Error("No categories found.");
	  }
  
	  // Extract plain category values
	  const uniqueCategories = categories.map(
		(category) => category.get({ plain: true }).category
	  );
	  return uniqueCategories;
	} catch (error) {
	  throw new DatabaseConnectionError("Failed to fetch product categories.");
	}
  });


  const getProductBrandsFromDB = withDatabaseConnectivity(async () => {
	try {
	  // Use a raw SQL query to fetch distinct brands, trimming whitespace
	  const [results] = await db.sequelize.query(`
		SELECT DISTINCT TRIM(brand) AS brand
		FROM products
		WHERE brand IS NOT NULL AND brand != ''
	  `);
  
	  // Extract brand values and log for debugging
	  const brands = results.map((row) => row.brand);
	  console.log("Distinct Brands Retrieved:", brands);
  
	  if (!brands.length) {
		throw new Error("No brands found.");
	  }
  
	  return brands;
	} catch (error) {
	  throw new DatabaseConnectionError("Failed to fetch product brands.");
	}
  });
  

// Add a new product

  
  // Add new variations


// Update a product

  
  // Update variations for a product

  

// Delete a product

  

  
// Banner-related functions

// Retrieve all banners


// Add a new banner


// Update a banner


// Delete a banner


// Get a banner by ID


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


const addCartItemToDB = withDatabaseConnectivity(
	async (userId, productVariationId, quantity) => {
	  const transaction = await db.sequelize.transaction(); // Start transaction
  
	  try {
		if (!userId || !productVariationId || !quantity) {
		  throw new InputValidationError(
			"Missing required fields: 'userId', 'productVariationId', or 'quantity'."
		  );
		}
  
		// Lock the row to prevent race conditions
		const cartItem = await db.Cart.findOne({
		  where: { accountId: userId, variationId: productVariationId },
		  transaction, // Include transaction
		  lock: transaction.LOCK.UPDATE, // Lock row for update
		});
  
		if (cartItem) {
		  // If item exists, increment quantity
		  await cartItem.update(
			{ quantity: cartItem.quantity + Number(quantity) },
			{ transaction }
		  );
		  console.log(
			`Updated cart item: ${productVariationId}, new quantity: ${cartItem.quantity + Number(quantity)}`
		  );
		} else {
		  // If item doesn't exist, create a new entry
		  await db.Cart.create(
			{
			  accountId: userId,
			  variationId: productVariationId,
			  quantity: Number(quantity),
			},
			{ transaction }
		  );
		 	 console.log(`Added new item to cart: ${productVariationId}, quantity: ${quantity}`);
		}
  
		await transaction.commit(); // Commit transaction
	  } catch (error) {
		await transaction.rollback(); // Rollback on failure
		if (error instanceof db.Sequelize.ValidationError) {
		  throw new InputValidationError(
			"Invalid input: " + error.errors.map((e) => e.message).join(", ")
		  );
		} else {
		  throw error;
		}
	  }
	}
  );
  
  
  
  
  /**
   * Get cart items for a specific user:
   * This returns the full cart, including any product/variation associations
   * that you want to load.
   */
  const getCartItemsFromDB = withDatabaseConnectivity(async (userId) => {
	try {
	  // Basic validation
	  if (!userId) {
		throw new InputValidationError("Missing required field: userId.");
	  }
  
	  // Using Sequelize to fetch all Cart items for the user
	  // Include Variation + nested Product if needed
	  const cartItems = await db.Cart.findAll({
		where: { accountId: userId },
		include: [
		  {
			model: db.Variations,
			as: "variation",
			include: [
			  {
				model: db.Products,
				as: "product",
			  },
			],
		  },
		],
	  });
  
	  // Convert to plain object array if desired
	  const plainCartItems = cartItems.map((item) => item.get({ plain: true }));
	  return plainCartItems;
	} catch (error) {
	  throw error;
	}
  });
  
  /**
   * Remove a specific cart item by its cart ID
   * (If you store cart items by `id`, you can remove by that ID).
   */
  const removeCartItemFromDB = withDatabaseConnectivity(async (cartItemId) => {
	try {
	  // Basic validation
	  if (!cartItemId) {
		throw new InputValidationError("Missing required field: cartItemId.");
	  }
  
	  // Attempt to destroy the cart item
	  await db.Cart.destroy({
		where: { id: cartItemId },
	  });
	} catch (error) {
	  throw error;
	}
  });
  

  


  // Retrieve all brand images from the database

  


  


  const getUserOrdersFromDB = withDatabaseConnectivity(async (userId) => {
	try {
	  const orders = await db.Order.findAll({
		where: { userId },
		include: [
		  {
			model: db.OrderItem,
			as: "items",
			// If you want product/variation data too, you can nest another include here:
			// include: [{ model: db.Variations, as: "variation" }]
		  },
		],
		order: [["createdAt", "DESC"]],
	  });
  
	  // Convert to plain JS objects
	  return orders.map((o) => o.get({ plain: true }));
	} catch (error) {
	  // Optionally wrap the error in a custom Error class
	  throw error;
	}
  });
  


// Export all errors and database utility functions as required
export {
    // Exporting product utility functions
	pingDatabase,
	getProductFromDB,
	getProductsFromDB,
	getProductsCategoryFromDB,
	getProductBrandsFromDB,

    // Exporting banner utility functions

    // // Exporting account utility functions
    getUserByUsernameOrEmail,  // Ensure this is only here once

	// Cart utilities
	addCartItemToDB,
	getCartItemsFromDB,
	removeCartItemFromDB,
	getUserOrdersFromDB,
	
    // Exporting error classes
    DatabaseError,
    DatabaseConnectionError,
    InputValidationError,
    ProductNotFoundError,
    ProductExistsError,
    BannerNotFoundError,
    BannerExistsError,
	UserNotFoundError,
};

