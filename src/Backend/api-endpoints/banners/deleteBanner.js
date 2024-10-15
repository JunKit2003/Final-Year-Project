import {
    DatabaseConnectionError,
    InputValidationError,
    BannerNotFoundError,
    deleteBannerFromDB,
    getBannerById // Import the function to get a banner by ID
} from '../../database/utils.js';
import { unlink, access } from 'fs/promises'; // Import access to check file existence
import { join } from 'path';

// Delete a banner image and its file
export default async function deleteBanner(req, res) {
    try {
        const { id } = req.params;

        // Step 1: Retrieve the banner details from the database
        const banner = await getBannerById(id); // Fetch the banner data

        // Check if banner was retrieved successfully
        if (!banner || !banner.directory) {
            throw new BannerNotFoundError(`Banner with id ${id} not found!`);
        }

        // Construct the full path to the image file to delete
        const imagePath = join("images", "banner_images", banner.directory);

        // Step 2: Check if the file exists
        await access(imagePath); // Throws if the file does not exist

        // Step 3: Attempt to delete the image file from the filesystem
        await unlink(imagePath);
        console.log(`Banner image file deleted: ${imagePath}`);

        // Step 4: After deleting the file, delete the database entry
        await deleteBannerFromDB(id); // Now safe to delete the entry

        // Respond with success message
        res.status(200).send({ message: 'Banner deleted successfully!' });
    } catch (error) {
        console.error('Error deleting banner: ', error);
        if (error instanceof InputValidationError || error instanceof SyntaxError) {
            return res.status(400).json({ message: error.message });
        } else if (error instanceof BannerNotFoundError) {
            return res.status(409).json({ message: error.message });
        } else if (error instanceof DatabaseConnectionError) {
            return res.status(500).json({ message: 'Unable to connect to the database!' });
        } else {
            res.status(500).send({ message: 'Internal server error: ', error });
        }
    }
}
