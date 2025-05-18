import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

// Accept multiple files with 'files' as the field name with no limit on the number of files
const uploadMultiple = upload.array("files"); // No second argument to make the number of files unlimited

// Use upload for single images and uploadMultiple for multiple images
export { upload, uploadMultiple };
