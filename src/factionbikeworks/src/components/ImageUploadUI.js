import React, { useState, useEffect } from "react";
import {
	Box,
	Button,
	TextField,
	IconButton,
	Checkbox,
	FormControlLabel,
	Typography,
	Fab,
} from "@mui/material";
import { Cancel as CancelIcon, Add as AddIcon } from "@mui/icons-material";

// Helper function to remove the file extension from a file name
const removeFileExtension = (fileName) => {
	const dotIndex = fileName.lastIndexOf(".");
	return dotIndex !== -1 ? fileName.slice(0, dotIndex) : fileName;
};

// Helper function to extract the file extension
const getFileExtension = (fileName) => {
	const dotIndex = fileName.lastIndexOf(".");
	return dotIndex !== -1 ? fileName.slice(dotIndex) : "";
};

const ImageUploadUI = ({
	colors,
	existingImagesData = {}, // Existing images data passed from the parent component
	handleClose,
	handleSave,
}) => {
	const [selectedColors, setSelectedColors] = useState([]); // Track selected colors
	const [images, setImages] = useState({}); // Track uploaded images for each color
	const [imageNames, setImageNames] = useState({}); // Track image names
	const [originalExtensions, setOriginalExtensions] = useState({}); // Store original file extensions

	// Load existing images and names when the component first mounts or when existingImagesData changes
	useEffect(() => {
		if (Object.keys(existingImagesData).length > 0) {
			// Set the files for each color in the images state
			setImages(
				Object.keys(existingImagesData).reduce((acc, color) => {
					return {
						...acc,
						[color]: existingImagesData[color]?.files || [], // Only store the files
					};
				}, {})
			);

			// Set the names for each color in the imageNames state
			setImageNames(
				Object.keys(existingImagesData).reduce((acc, color) => {
					return {
						...acc,
						[color]:
							existingImagesData[color]?.names.map((name) =>
								removeFileExtension(name)
							) || [], // Store names without extensions
					};
				}, {})
			);

			// Store the original extensions
			setOriginalExtensions(
				Object.keys(existingImagesData).reduce((acc, color) => {
					return {
						...acc,
						[color]:
							existingImagesData[color]?.names.map((name) =>
								getFileExtension(name)
							) || [], // Store the extensions
					};
				}, {})
			);

			// Automatically select colors that have existing images
			setSelectedColors(Object.keys(existingImagesData));
		}
	}, [existingImagesData]);

	// Handle color selection via checkbox
	const handleColorToggle = (color) => {
		setSelectedColors((prev) =>
			prev.includes(color)
				? prev.filter((c) => c !== color)
				: [...prev, color]
		);
	};

	// Handle file upload, updating the images and setting default names
	const handleFileChange = (color, event) => {
		const files = Array.from(event.target.files);

		// Merge new files with the existing ones for this color
		setImages((prevImages) => {
			const currentImages = Array.isArray(prevImages[color])
				? prevImages[color]
				: [];
			const newImages = [...currentImages, ...files]; // Merge existing and new files

			return {
				...prevImages,
				[color]: newImages, // Ensure previous images are not overwritten
			};
		});

		// Update image names and extensions accordingly
		setImageNames((prevNames) => {
			const currentNames = prevNames[color] || [];
			const startIndex = currentNames.length;

			const newNames = [
				...currentNames,
				...files.map((file, idx) => `${color}_${startIndex + idx + 1}`), // Generate new image names without extension
			];

			return {
				...prevNames,
				[color]: newNames,
			};
		});

		setOriginalExtensions((prevExtensions) => {
			const currentExtensions = prevExtensions[color] || [];

			const newExtensions = [
				...currentExtensions,
				...files.map((file) => getFileExtension(file.name)),
			];

			return {
				...prevExtensions,
				[color]: newExtensions,
			};
		});
	};

	// Handle changing the image name, preserving the original extension
	const handleImageNameChange = (color, index, newName) => {
		setImageNames((prevNames) => ({
			...prevNames,
			[color]: prevNames[color].map((name, i) =>
				i === index ? newName : name
			),
		}));
	};

	// Handle removing an image from the selected color
	const handleRemoveImage = (color, index) => {
		setImages((prevImages) => ({
			...prevImages,
			[color]: prevImages[color].filter((_, i) => i !== index),
		}));

		// Update the names and extensions accordingly
		setImageNames((prevNames) => ({
			...prevNames,
			[color]: prevNames[color].filter((_, i) => i !== index),
		}));
		setOriginalExtensions((prevExtensions) => ({
			...prevExtensions,
			[color]: prevExtensions[color].filter((_, i) => i !== index),
		}));
	};

	// Handle Save
	const saveImages = () => {
		const colorImages = Object.keys(images).reduce((acc, color) => {
			acc[color] = {
				files: images[color],
				names: imageNames[color].map(
					(name, idx) => `${name}${originalExtensions[color][idx]}`
				), // Combine name with its original extension
			};
			return acc;
		}, {});

		handleSave(colorImages);
	};

	return (
		<Box sx={{ p: 3 }}>
			<Typography variant="h6" sx={{ mb: 2 }}>
				Upload Images for variations
			</Typography>

			{/* Checkboxes to toggle image upload sections for each color */}
			{colors.map((color) => (
				<Box key={color} sx={{ mb: 4 }}>
					<FormControlLabel
						control={
							<Checkbox
								checked={selectedColors.includes(color)}
								onChange={() => handleColorToggle(color)}
							/>
						}
						label={`Upload Images for ${color}`}
					/>

					{/* Show image upload section when color is selected */}
					{selectedColors.includes(color) && (
						<Box sx={{ mt: 2, ml: 4 }}>
							{/* Display uploaded images as tiles for the color */}
							<Box
								sx={{
									display: "flex",
									flexWrap: "wrap",
									gap: 2,
									mt: 2,
								}}
							>
								{Array.isArray(images[color]) &&
									images[color].map((file, index) => (
										<Box
											key={index}
											sx={{
												width: "100px",
												height: "160px",
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												border: "1px solid lightgrey",
												borderRadius: "8px",
												p: 1,
											}}
										>
											{/* Image Preview */}
											<Box
												sx={{
													width: "100px",
													height: "100px",
													overflow: "hidden",
													borderRadius: "8px",
													mb: 1,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<Box
													component="img"
													src={
														file instanceof File
															? URL.createObjectURL(
																	file
															  ) // Preview new files
															: file // Existing files are assumed to be URLs
													}
													alt={`Preview of ${
														file.name ||
														"uploaded image"
													}`}
													sx={{
														width: "100%",
														height: "100%",
														objectFit: "cover",
													}}
												/>
											</Box>

											{/* Image Name Field */}
											<TextField
												label="Image Name"
												value={
													imageNames[color]?.[
														index
													] || ""
												}
												onChange={(e) =>
													handleImageNameChange(
														color,
														index,
														e.target.value
													)
												}
												sx={{ mb: 1, width: "100%" }}
											/>

											{/* Remove Image Button */}
											<IconButton
												size="small"
												onClick={() =>
													handleRemoveImage(
														color,
														index
													)
												}
											>
												<CancelIcon fontSize="small" />
											</IconButton>
										</Box>
									))}
							</Box>

							{/* Add more images button */}
							<Box sx={{ mt: 2, textAlign: "center" }}>
								<input
									type="file"
									accept="image/*"
									style={{ display: "none" }}
									id={`file-upload-${color}`}
									multiple
									onChange={(e) => handleFileChange(color, e)}
								/>
								<label htmlFor={`file-upload-${color}`}>
									<Fab
										color="primary"
										component="span"
										size="small"
									>
										<AddIcon />
									</Fab>
								</label>
							</Box>
						</Box>
					)}
				</Box>
			))}

			<Box
				sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}
			>
				<Button
					onClick={handleClose}
					color="primary"
					variant="outlined"
				>
					Close
				</Button>
				<Button
					onClick={saveImages}
					color="primary"
					variant="contained"
				>
					Save Images
				</Button>
			</Box>
		</Box>
	);
};

export default ImageUploadUI;
