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
		include: [{ model: db.Variations, as: "variations" }],
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
	  const products = await db.Products.findAll({
		include: [{ model: db.Variations, as: "variations" }],
	  });
  
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
const addProductToDB = withDatabaseConnectivity(async (productDetails) => {
	try {
	  const { category, name, brand, description } = productDetails;
  
	  // Check if product already exists
	  const existingProduct = await db.Products.findOne({ where: { name } });
  
	  if (existingProduct) {
		throw new ProductExistsError();
	  }
  
	  // Create new product
	  const newProduct = await db.Products.create({
		category,
		name,
		brand,
		description,
	  });
  
	  return newProduct; // Return the created product
	} catch (error) {
	  if (error instanceof db.Sequelize.ValidationError) {
		throw new InputValidationError(
		  "Invalid input: " + error.errors.map((e) => e.message).join(", ")
		);
	  } else {
		throw error;
	  }
	}
  });
  
  // Add new variations
  const addVariationsToDB = withDatabaseConnectivity(async (variations) => {
	try {
	  await db.Variations.bulkCreate(variations);
	} catch (error) {
	  if (error instanceof db.Sequelize.ValidationError) {
		throw new InputValidationError(
		  "Invalid input: " + error.errors.map((e) => e.message).join(", ")
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
		const { category, name, brand, description } = productDetails;
  
		const product = await db.Products.findByPk(id);
		if (!product) {
		  throw new ProductNotFoundError();
		}
  
		await product.update({
		  category,
		  name,
		  brand,
		  description,
		});
	  } catch (error) {
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
  
  // Update variations for a product
  const updateVariationsToDB = withDatabaseConnectivity(
	async (productId, variations) => {
	  try {
		// Fetch existing variations for the product
		const existingVariations = await db.Variations.findAll({
		  where: { productId },
		});
  
		const existingVariationIds = existingVariations.map((v) => v.id);
  
		const receivedVariationIds = variations
		  .filter((v) => v.id)
		  .map((v) => v.id);
  
		// Variations to delete (existing variations not in received list)
		const variationsToDelete = existingVariations.filter(
		  (v) => !receivedVariationIds.includes(v.id)
		);
  
		// Variations to update (existing variations in received list)
		const variationsToUpdate = variations.filter((v) => v.id);
  
		// Variations to create (new variations without id)
		const variationsToCreate = variations.filter((v) => !v.id);
  
		// Delete variations
		for (let variation of variationsToDelete) {
		  await variation.destroy();
		}
  
		// Update variations
		for (let variationData of variationsToUpdate) {
		  const variation = await db.Variations.findByPk(variationData.id);
		  if (variation) {
			await variation.update(variationData);
		  }
		}
  
		// Create new variations
		for (let variationData of variationsToCreate) {
		  variationData.productId = productId;
		  await db.Variations.create(variationData);
		}
	  } catch (error) {
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
  

// Delete a product
const deleteProductFromDB = withDatabaseConnectivity(async (id) => {
	try {
	  // 1) Find the product
	  const product = await db.Products.findByPk(id);
	  if (!product) {
		throw new ProductNotFoundError();
	  }
	  
	  // Capture the brand field from the product row
	  // (Assumes your products table has a column named 'brand')
	  const { brand } = product;
  
	  // 2) Remove the product's images (folder per product) if they exist
	  const folderPath = path.join("images", "product_images", id.toString());
	  if (fs.existsSync(folderPath)) {
		await fs.promises.rm(folderPath, { recursive: true, force: true });
	  }
  
	  // 3) Delete the product
	  await product.destroy();
  
	  // 4) Check if this brand is still referenced by any other product
	  const remainingProducts = await db.Products.findAll({
		where: { brand },
	  });
  
	  if (remainingProducts.length === 0) {
		// 4a) No more products for this brand -> remove brand_images entry
		// IMPORTANT: brand_images table likely stores brandName in a column called "brandName"
		const brandImage = await db.BrandImages.findOne({
		  where: { brandName: brand },
		});
  
		if (brandImage) {
		  // 4b) Remove the brand image file from the server
		  // brandImage.imagePath might be "4_1234.jpg" or similar
		  const brandImageFilePath = path.join(
			"images", 
			"brand_images", 
			path.basename(brandImage.imagePath)
		  );
  
		  if (fs.existsSync(brandImageFilePath)) {
			await fs.promises.rm(brandImageFilePath, { force: true });
		  }
  
		  // 4c) Delete record from brand_images table
		  await brandImage.destroy();
		}
	  }
	} catch (error) {
	  throw error; // Rethrow so your upper-level try/catch can handle it
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




const addCartItemToDB = withDatabaseConnectivity(
	async (userId, productVariationId, quantity) => {
	  try {
		if (!userId || !productVariationId || !quantity) {
		  throw new InputValidationError(
			"Missing required fields: 'userId', 'productVariationId', or 'quantity'."
		  );
		}
  
		const [cartItem, created] = await db.Cart.findOrCreate({
		  where: { accountId: userId, variationId: productVariationId },
		  defaults: { quantity },
		});
  
		if (!created) {
		  cartItem.quantity += Number(quantity);
		  await cartItem.save();
		}
	  } catch (error) {
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
  
  const getAllOrdersFromDB = withDatabaseConnectivity(async () => {
	try {
	  // db.Order might be named differently in your code
	  // Adjust if your model is named `Orders` or something else
	  const orders = await db.Order.findAll({
		include: [
		  {
			model: db.OrderItem,
			as: "items",
			// If you need to include product data for each item, you can nest includes:
			// include: [{ model: db.Variations, as: "variation" }]
		  },
		],
		// Optionally order by newest first
		order: [["createdAt", "DESC"]],
	  });
  
	  // Convert each order to a plain JS object
	  return orders.map((o) => o.get({ plain: true }));
	} catch (error) {
	  // If needed, wrap the error in your custom DatabaseError or InputValidationError
	  throw error;
	}
  });
  
  const setOrderStatusInDB = withDatabaseConnectivity(async (orderId, status) => {
	try {
	  // Fetch the order by its ID
	  const order = await db.Order.findByPk(orderId);
	  if (!order) {
		throw new InputValidationError(`Order with ID ${orderId} not found.`);
	  }
  
	  // Optionally: check that current status is something like "Paid" before fulfilling
	  // if (order.status !== "Paid") {
	  //   throw new InputValidationError(
	  //     `Order must be "Paid" before fulfilling. Current status: ${order.status}`
	  //   );
	  // }
  
	  // Update the status
	  await order.update({ status });
  
	  // No return is required, but you may choose to return the updated order
	  // return order.get({ plain: true });
	} catch (error) {
	  throw error;
	}
  });


  // Retrieve all brand images from the database
const getBrandImagesFromDB = withDatabaseConnectivity(async () => {
	try {
	  const brands = await db.BrandImages.findAll();
  
	  if (!brands.length) {
		throw new Error("No brand images found.");
	  }
  
	  // Extract plain brand image data
	  return brands.map((brand) => brand.get({ plain: true }));
	} catch (error) {
	  throw new DatabaseConnectionError("Failed to fetch brand images.");
	}
  });
  

  const updateBrandImageInDB = withDatabaseConnectivity(async (id, brandDetails = null) => {
	try {
	  // Find brand image entry by primary key
	  const brand = await db.BrandImages.findByPk(id);
  
	  if (!brand) {
		return null;
	  }
  
	  // If brandDetails is not provided, return the existing brand data
	  if (!brandDetails) {
		return brand;
	  }
  
	  // Update only the `imagePath` (and isVisible if you wish)
	  await brand.update({
		imagePath: brandDetails.imagePath || brand.imagePath,
		isVisible:
		  brandDetails.isVisible !== undefined
			? brandDetails.isVisible
			: brand.isVisible,
	  });
  
	  return brand;
	} catch (error) {
	  if (error instanceof db.Sequelize.ValidationError) {
		throw new InputValidationError(
		  "Invalid input: " + error.errors.map((e) => e.message).join(", ")
		);
	  } else {
		throw error;
	  }
	}
  });
  


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
	addProductToDB,
	addVariationsToDB, // Newly added
	updateProductToDB,
	updateVariationsToDB, // Newly added
	deleteProductFromDB,
	getProductsCategoryFromDB,
	getProductBrandsFromDB,
	getBrandImagesFromDB,
	updateBrandImageInDB,

    // Exporting banner utility functions
    getBannersFromDB,
    addBannerToDB,
    updateBannerToDB,
    deleteBannerFromDB,
    getBannerById,

    // // Exporting account utility functions
    getUserByUsernameOrEmail,  // Ensure this is only here once

	// Cart utilities
	addCartItemToDB,
	getCartItemsFromDB,
	removeCartItemFromDB,
	setOrderStatusInDB,
	getAllOrdersFromDB,
	getUserOrdersFromDB,
	
    // Exporting error classes
    DatabaseError,
    DatabaseConnectionError,
    InputValidationError,
    ProductNotFoundError,
    ProductExistsError,
    BannerNotFoundError,
    BannerExistsError,
};

