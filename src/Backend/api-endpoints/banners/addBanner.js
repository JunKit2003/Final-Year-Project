import {
    pingDatabase,
    DatabaseConnectionError,
    InputValidationError,
    addBannerToDB,
} from "../../database/utils.js";

import uploadBannerImages from "../../file-uploads/uploadBannerImages.js"; // Adjust the path as necessary

// Add a new banner image
export default async function addBanner(req, res) {
    try {
        const files = req.files; // Multer stores files here

        if (!files || !files.length) {
            throw new InputValidationError("No images uploaded.");
        }

        // Create names for images ensuring they are unique
        const imagesData = files.map((file, index) => ({
            file: file,
            name: `banner_image_${Date.now()}_${index + 1}`, // Unique name using timestamp
        }));

        //console.log("Images Data:", imagesData); // Log to check format

        // Save images and get the filenames (not paths)
        const filenames = await uploadBannerImages(imagesData);

        // For each filename, save a new entry in the banner_image database table
        for (const filename of filenames) {
            await addBannerToDB({ directory: filename }); // Save only the filename
        }

        res.status(201).send({ message: "Banners added successfully!" });
    } catch (error) {
        if (error instanceof InputValidationError || error instanceof SyntaxError) {
            return res.status(400).json({ message: error.message });
        } else if (error instanceof DatabaseConnectionError) {
            return res.status(500).json({ message: "Unable to connect to the database!" });
        } else {
            console.error("Error adding banner: ", error);
            res.status(500).send({ message: "Internal server error", error });
        }
    }
}
