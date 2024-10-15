import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Pagination } from "@mui/material";
import LoadingButton from "../LoadingButton";
import ControlledCarousel from "../../components/Carousel/ControlledCarousel.js"; // Import the new carousel

const ProductView = ({
	products,
	handleOpenForm,
	handleDeleteProduct,
	isDeleting,
	itemsPerPage = 6,
	resetPage,
}) => {
	const [currentPage, setCurrentPage] = useState(1);
	const shouldResetPage = useRef(false);

	// Calculate number of pages
	const totalPages = Math.ceil(products.length / itemsPerPage);

	useEffect(() => {
		if (resetPage) {
			shouldResetPage.current = true;
		}
	}, [resetPage]);

	useEffect(() => {
		if (shouldResetPage.current || currentPage > totalPages) {
			setCurrentPage(1);
			shouldResetPage.current = false;
		}
	}, [totalPages, currentPage]);

	const currentProducts = products.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	const handlePageChange = (event, page) => {
		setCurrentPage(page);
	};

	const truncateDescription = (description) => {
		if (!description) return "No description available";
		return description.length > 50
			? `${description.slice(0, 50)}...`
			: description;
	};

	if (products.length === 0) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100%",
					p: 3,
				}}
			>
				<Typography variant="h6">No products available!</Typography>
			</Box>
		);
	}

	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				p: 3,
			}}
		>
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					gap: 2,
					justifyContent: "center",
					width: "100%",
				}}
			>
				{currentProducts.map((product) => {
					const imagesData = product.imagesData || {};
					const colors = Object.keys(imagesData);
					const images = colors.flatMap(
						(color) => imagesData[color]?.files || []
					);

					// Sort images alphabetically by color
					images.sort();

					return (
						<Box
							key={product.id}
							sx={{
								width: "300px",
								border: "1px solid grey",
								borderRadius: 2,
								p: 2,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
							}}
						>
							{/* Image Carousel */}
							{images.length > 0 ? (
								<ControlledCarousel images={images} />
							) : (
								<Box
									sx={{
										width: "100%",
										height: "200px",
										background: "grey",
										mb: 2,
										borderRadius: "15px",
										display: "flex",
										justifyContent: "center",
										alignItems: "center",
										color: "white", // Adjust the text color to be visible on the grey background
										fontSize: "18px", // Optional: Adjust the font size for better readability
										fontWeight: "bold", // Optional: Make the text bold for better visibility
									}}
								>
									No Images Available!
								</Box>
							)}

							{/* Product details */}
							<Typography variant="h6">{product.name}</Typography>
							<Typography>
								Category: {product.category}
							</Typography>
							<Typography>Brand: {product.brand}</Typography>
							<Typography>Price: {product.price}</Typography>
							<Typography>
								Colors:{" "}
								{Array.isArray(product.colors) &&
								product.colors.length > 0
									? product.colors.join(", ")
									: "No colors available"}
							</Typography>
							<Typography
								sx={{
									textAlign: "center",
									wordWrap: "break-word",
								}}
							>
								Description:{" "}
								{truncateDescription(product.description)}
							</Typography>

							{/* Action buttons */}
							<Box sx={{ mt: 2 }}>
								<Button
									variant="outlined"
									color="secondary"
									onClick={() => handleOpenForm(product)}
								>
									Edit
								</Button>
								<LoadingButton
									variant="outlined"
									color="error"
									onClick={() =>
										handleDeleteProduct(product.id)
									}
									isLoading={isDeleting}
									sx={{ ml: 2 }}
								>
									Delete
								</LoadingButton>
							</Box>
						</Box>
					);
				})}
			</Box>

			{/* Pagination component */}
			<Pagination
				count={totalPages}
				page={currentPage}
				onChange={handlePageChange}
				sx={{ mt: 3 }}
				color="primary"
			/>
		</Box>
	);
};

export default ProductView;
