// Utility function to format input string (capitalizing and removing special characters)
const formatInput = (input) => {
	return input
		.replace(/[^a-zA-Z0-9 ]/g, " ") // Remove special characters, keeping only letters, numbers, and spaces
		.toLowerCase() // Convert the entire string to lowercase
		.replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize the first letter after spaces and the start
};

const urlToFile = async (url, fileName) => {
	try {
		const response = await fetch(url);
		const blob = await response.blob();
		const extension = url.split(".").pop();
		const mimeType = blob.type || `image/${extension}`;

		return new File([blob], fileName, { type: mimeType });
	} catch (error) {
		console.error("Error converting URL to file:", error);
		return null;
	}
};

const convertImagesDataToFiles = async (products) => {
	const updatedProducts = await Promise.all(
		products.map(async (product) => {
			if (product.imagesData) {
				const updatedImagesData = await Promise.all(
					Object.entries(product.imagesData).map(
						async ([color, data]) => {
							const updatedFiles = await Promise.all(
								data.files.map((url, index) => {
									const fileName =
										data.names[index] ||
										`${color}_${index + 1}`;
									return urlToFile(url, fileName);
								})
							);

							return [color, { ...data, files: updatedFiles }];
						}
					)
				);

				product.imagesData = Object.fromEntries(updatedImagesData);
			}

			return product;
		})
	);

	return updatedProducts;
};

export { convertImagesDataToFiles, formatInput} 