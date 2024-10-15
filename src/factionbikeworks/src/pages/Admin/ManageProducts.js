import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import PopupDisplay from "../../components/PopupDisplay";
import Loading from "../../components/Loading";
import LoadingButton from "../../components/LoadingButton";
import ProductView from "../../components/Admin/ProductView";
import AddEditProductForm from "../../components/Admin/AddEditProductForm";
import FilterSearch from "../../components/FilterSearch"; // Import the search component
import { convertImagesDataToFiles, formatInput } from "../../utils"; // Assuming this is where formatInput is stored

const ManageProducts = () => {
	const [products, setProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [categoryOptions, setCategoryOptions] = useState([]); // To store unique categories
	const [resetPage, setResetPage] = useState(false);
	const [openForm, setOpenForm] = useState(false);
	const [snackbarMessage, setSnackbarMessage] = useState(null);
	const [severity, setSeverity] = useState("error");
	const [openSnackbar, setOpenSnackbar] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [editingProductId, setEditingProductId] = useState(null); // Track product being edited
	const autoHideDuration = 6000;

	const filters = [
		{ label: "Category", value: "category" },
		{ label: "Name", value: "name" },
		{ label: "Brand", value: "brand" },
		{ label: "Price", value: "price" },
		{ label: "Color", value: "color" },
	];

	useEffect(() => {
		fetchProducts();
	}, []);

	const fetchProducts = async () => {
		setLoading(true);
		try {
			const response = await axios.post(
				`${process.env.REACT_APP_BACKEND_HOST}/api/product/get`
			);
			let products = response.data.products || [];

			// Convert URLs in imagesData to File objects
			products = await convertImagesDataToFiles(products);

			setProducts(products);
			setFilteredProducts(products);

			// Extract unique categories and format them
			const uniqueCategories = Array.from(
				new Set(
					products.map((product) => formatInput(product.category))
				)
			);
			setCategoryOptions(uniqueCategories);
		} catch (error) {
			console.log(error);
			if (error?.response?.data?.products) {
				setSnackbarMessage(
					error.response.data.message || "Error fetching products!"
				);
				setSeverity("error");
				setOpenSnackbar(true);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = (searchCriteria) => {
		const { searchQueries, selectedFilters } = searchCriteria;

		let filtered = products;

		// Apply filters based on selected filters
		if (
			selectedFilters.includes("category") &&
			searchQueries.category.length > 0
		) {
			filtered = filtered.filter((product) =>
				searchQueries.category.some(
					(selectedCategory) =>
						selectedCategory.toLowerCase() ===
						product.category.toLowerCase()
				)
			);
		}

		if (selectedFilters.includes("name") && searchQueries.name) {
			filtered = filtered.filter((product) =>
				product.name
					?.toLowerCase()
					.includes(searchQueries.name.toLowerCase())
			);
		}

		if (selectedFilters.includes("brand") && searchQueries.brand) {
			filtered = filtered.filter((product) =>
				product.brand
					?.toLowerCase()
					.includes(searchQueries.brand.toLowerCase())
			);
		}

		if (
			selectedFilters.includes("price") &&
			searchQueries.price.min !== "" &&
			searchQueries.price.max !== ""
		) {
			filtered = filtered.filter(
				(product) =>
					product.price >= parseFloat(searchQueries.price.min) &&
					product.price <= parseFloat(searchQueries.price.max)
			);
		}

		if (
			selectedFilters.includes("color") &&
			searchQueries.colors.length > 0
		) {
			filtered = filtered.filter((product) =>
				searchQueries.colors.some((color) =>
					product.colors.includes(color)
				)
			);
		}

		setFilteredProducts(filtered);
		setResetPage(true); // Set the reset flag
	};

	const handleOpenForm = (product = null) => {
		setEditingProductId(product ? product.id : null); // Track the product ID (if editing)
		setOpenForm(true);
	};

	const handleCloseForm = () => {
		setOpenForm(false);
		setEditingProductId(null); // Reset after closing the form
	};

	const handleSaveProduct = async (productData) => {
		setIsSaving(true);

		try {
			const formData = new FormData();

			// Append product details to the formData
			formData.append("name", productData.name);
			formData.append("brand", productData.brand);
			formData.append("category", productData.category);
			formData.append("price", productData.price);
			formData.append("colors", JSON.stringify(productData.colors));
			formData.append("description", productData.description);
			formData.append("status", productData.status); // Add status to formData
			formData.append("hasImageChanges", productData.hasImageChanges);

			// Append imagesData if present
			if (productData.imagesData && productData.hasImageChanges) {
				Object.keys(productData.imagesData).forEach((color) => {
					const { files, names } = productData.imagesData[color];

					// Append each file with its corresponding name
					files.forEach((file, index) => {
						formData.append(`keys`, color); // Color or any grouping key
						formData.append("files", file); // Multer expects 'files' field name
						formData.append("names", names[index]); // Append the corresponding name
					});
				});
			}

			if (editingProductId) {
				// Update existing product
				await axios.put(
					`${process.env.REACT_APP_BACKEND_HOST}/api/product/edit/${editingProductId}`,
					formData,
					{ headers: { "Content-Type": "multipart/form-data" } }
				);
				setSnackbarMessage("Product updated successfully!");
			} else {
				// Add new product
				await axios.post(
					`${process.env.REACT_APP_BACKEND_HOST}/api/product/add`,
					formData,
					{ headers: { "Content-Type": "multipart/form-data" } }
				);
				setSnackbarMessage("Product added successfully!");
			}

			setSeverity("success");
			setOpenSnackbar(true);
			fetchProducts();
			handleCloseForm();
		} catch (error) {
			setSnackbarMessage(
				error?.response?.data?.message || "Error saving product!"
			);
			setSeverity("error");
			setOpenSnackbar(true);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteProduct = async (id) => {
		setIsDeleting(true);
		try {
			await axios.delete(
				`${process.env.REACT_APP_BACKEND_HOST}/api/product/delete/${id}`
			);
			setSnackbarMessage("Product deleted successfully!");
			setSeverity("success");
			setOpenSnackbar(true);
			setProducts(products.filter((p) => p.id !== id));
			setFilteredProducts(filteredProducts.filter((p) => p.id !== id)); // Update filtered products
		} catch (error) {
			setSnackbarMessage(
				error?.response?.data?.message || "Error deleting product!"
			);
			setSeverity("error");
			setOpenSnackbar(true);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCloseSnackbar = () => {
		setOpenSnackbar(false);
		setSnackbarMessage(null);
	};

	if (loading) {
		return <Loading />;
	}

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				minHeight: "100vh", // Ensure full height of the viewport
				padding: 3, // General padding
				boxSizing: "border-box", // Ensure padding doesn't cause overflow
			}}
		>
			{/* Title and Add Product Button */}
			<Box sx={{ mb: 2 }}>
				<Typography variant="h4">Manage Products</Typography>
				<LoadingButton
					variant="contained"
					color="primary"
					onClick={() => handleOpenForm()}
					isLoading={isSaving}
					sx={{ mt: 2 }}
				>
					Add Product
				</LoadingButton>
			</Box>

			{/* Search and Filter Component */}
			<FilterSearch
				filters={filters}
				onSearch={handleSearch}
				categoryOptions={categoryOptions} // Pass unique categories here
			/>

			<ProductView
				products={filteredProducts} // Pass filtered products
				handleOpenForm={handleOpenForm}
				handleDeleteProduct={handleDeleteProduct}
				isDeleting={isDeleting}
				itemsPerPage={50}
				resetPage={resetPage}
			/>

			{/* Dialog for adding or editing product */}
			<Dialog
				open={openForm}
				onClose={handleCloseForm}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle>
					{editingProductId ? "Edit Product" : "Add Product"}
				</DialogTitle>
				<AddEditProductForm
					initialProductData={
						editingProductId
							? products.find((p) => p.id === editingProductId)
							: {
									category: "",
									name: "",
									brand: "",
									price: "",
									colors: [],
									description: "",
									status: "Available", // Set default status for new product
							  } // Default object for new product
					} // Pass current product only if editing
					handleSaveProduct={handleSaveProduct}
					handleCloseForm={handleCloseForm}
					isSaving={isSaving}
				/>
			</Dialog>

			{/* Snackbar for displaying errors or success messages */}
			<PopupDisplay
				message={snackbarMessage}
				severity={severity}
				open={openSnackbar}
				onClose={handleCloseSnackbar}
				autoHideDuration={autoHideDuration}
			/>
		</Box>
	);
};

export default ManageProducts;
