import React, { useEffect, useState } from "react";
import {
	DialogContent,
	DialogActions,
	Button,
	Dialog,
	Box,
} from "@mui/material";
import BubbleSelector from "../BubbleSelector";
import TextFieldWithCounter from "../TextFieldWithCounter";
import LoadingButton from "../LoadingButton";
import ImageUploadUI from "../ImageUploadUI";

const AddEditProductForm = ({
	initialProductData,
	handleSaveProduct,
	handleCloseForm,
	isSaving,
}) => {
	const CHARACTER_LIMITS = {
		category: 50,
		name: 100,
		brand: 100,
		price: 15,
		colors: 100,
		description: 500,
	};

	const [currentProduct, setCurrentProduct] = useState(initialProductData);
	const [imagesData, setImagesData] = useState({});
	const [hasImageChanges, setHasImageChanges] = useState(false);
	const [openImageUploadUI, setOpenImageUploadUI] = useState(false);
	const [status, setStatus] = useState(initialProductData.status || "Available"); // Track status

	useEffect(() => {
		if (initialProductData.imagesData) {
			setImagesData(initialProductData.imagesData);
		}
	}, [initialProductData.imagesData]);

	const handleInputChange = (event) => {
		const { name, value } = event.target;
		setCurrentProduct((prevProduct) => ({
			...prevProduct,
			[name]: value,
		}));
	};

	const handleOpenImageUploadUI = () => {
		setOpenImageUploadUI(true);
	};

	const handleCloseImageUploadUI = () => {
		setOpenImageUploadUI(false);
	};

	const handleSaveImages = (colorImages) => {
		setImagesData((prevData) => {
			const mergedData = {
				...prevData,
				...colorImages,
			};

			const isSame = JSON.stringify(prevData) === JSON.stringify(mergedData);
			if (!isSame) {
				setHasImageChanges(true);
			}

			return mergedData;
		});

		handleCloseImageUploadUI();
	};

	const handleSave = () => {
		const cleanedImagesData = Object.keys(imagesData)
			.filter((color) => currentProduct.colors.includes(color))
			.reduce((acc, color) => {
				acc[color] = imagesData[color];
				return acc;
			}, {});

		const hasImageChangesFinal =
			JSON.stringify(imagesData) !== JSON.stringify(cleanedImagesData);

		const productData = {
			...currentProduct,
			imagesData: cleanedImagesData,
			hasImageChanges: hasImageChanges || hasImageChangesFinal,
			status, // Include status in the product data
		};

		handleSaveProduct(productData);
	};

	const handleStatusChange = (newStatus) => {
		setStatus(newStatus);
	};

	return (
		<>
			<DialogContent
				sx={{
					maxHeight: "600px",
					overflowY: "auto",
				}}
			>
				<TextFieldWithCounter
					label="Item Category"
					name="category"
					value={currentProduct.category}
					onChange={handleInputChange}
					characterLimit={CHARACTER_LIMITS.category}
				/>
				<TextFieldWithCounter
					label="Item Name"
					name="name"
					value={currentProduct.name}
					onChange={handleInputChange}
					characterLimit={CHARACTER_LIMITS.name}
				/>
				<TextFieldWithCounter
					label="Item Brand"
					name="brand"
					value={currentProduct.brand}
					onChange={handleInputChange}
					characterLimit={CHARACTER_LIMITS.brand}
				/>
				<TextFieldWithCounter
					label="Item Price"
					name="price"
					value={currentProduct.price}
					onChange={handleInputChange}
					characterLimit={CHARACTER_LIMITS.price || Infinity}
					numericOnly
				/>
				<BubbleSelector
					items={currentProduct.colors}
					setItems={(newColors) =>
						handleInputChange({
							target: { name: "colors", value: newColors },
						})
					}
					label="Add Color"
					helperText="Press Enter to add a color."
					characterLimit={CHARACTER_LIMITS.colors}
					maxHeight={150}
				/>
				<Box sx={{ mt: 1, mb: 3 }}>
					<Button
						onClick={handleOpenImageUploadUI}
						color="primary"
						variant="contained"
					>
						Add Images for Colors
					</Button>
				</Box>
				<TextFieldWithCounter
					label="Item Description"
					name="description"
					value={currentProduct.description}
					onChange={handleInputChange}
					characterLimit={CHARACTER_LIMITS.description}
				/>

				{/* Status Buttons */}
				<Box sx={{ mt: 2 }}>
					<Button
						variant={status === "Available" ? "contained" : "outlined"}
						color="success"
						onClick={() => handleStatusChange("Available")}
					>
						Available
					</Button>
					<Button
						variant={status === "Out of stock" ? "contained" : "outlined"}
						color="error"
						onClick={() => handleStatusChange("Out of stock")}
						sx={{ ml: 2 }} // Add margin-left for spacing
					>
						Out of stock
					</Button>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleCloseForm} color="primary">
					Cancel
				</Button>
				<LoadingButton
					onClick={handleSave}
					color="primary"
					isLoading={isSaving}
				>
					Save
				</LoadingButton>
			</DialogActions>

			<Dialog
				open={openImageUploadUI}
				onClose={handleCloseImageUploadUI}
				maxWidth="md"
				fullWidth
			>
				<ImageUploadUI
					colors={currentProduct.colors}
					existingImagesData={imagesData}
					handleSave={handleSaveImages}
					handleClose={handleCloseImageUploadUI}
				/>
			</Dialog>
		</>
	);
};

export default AddEditProductForm;
