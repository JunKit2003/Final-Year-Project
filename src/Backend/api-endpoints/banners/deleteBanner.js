import {
    DatabaseConnectionError,
    InputValidationError,
    BannerNotFoundError,
    deleteBannerFromDB,
    getBannerById
} from "../../database/utils.js";
import { unlink, access } from "fs/promises";
import { join } from "path";

// Delete a banner image and its file
export default async function deleteBanner(req, res) {
    try {
        const { id } = req.params;

        // Step 1: Retrieve the banner details from the database
        const banner = await getBannerById(id);

        // Check if banner was retrieved successfully
        if (!banner || !banner.directory) {
            throw new BannerNotFoundError(`Banner with id ${id} not found!`);
        }

        // Construct the full path to the image file
        const imagePath = join("images", "banner_images", banner.directory);

        // Step 2 & 3: Attempt to delete the file if it exists
        try {
            // Check if the file exists
            await access(imagePath);
            // If found, remove it
            await unlink(imagePath);
            //console.log(`Banner image file deleted: ${imagePath}`);
        } catch (error) {
            // If the file is missing or any other 'ENOENT' scenario:
            if (error.code === "ENOENT" || error.message?.includes("not found")) {
                //console.warn(`File does not exist: ${imagePath}, proceeding with DB deletion.`);
            } else {
                // If some other error occurred, rethrow it
                throw error;
            }
        }

        // Step 4: Delete the DB entry
        await deleteBannerFromDB(id);

        // Respond with success message
        return res.status(200).json({ message: "Banner deleted successfully!" });
    } catch (error) {
        //console.error("Error deleting banner:", error);

        if (error instanceof InputValidationError || error instanceof SyntaxError) {
            return res.status(400).json({ message: error.message });
        } else if (error instanceof BannerNotFoundError) {
            return res.status(409).json({ message: error.message });
        } else if (error instanceof DatabaseConnectionError) {
            return res.status(500).json({ message: "Unable to connect to the database!" });
        } else {
            return res.status(500).json({
                message: "Internal server error",
                error: error.message,
            });
        }
    }
}
