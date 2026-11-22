import { publicBrands } from "../../features/brands/service.js";

// POST /api/product/getBrandImages: visible brands with live products, in order.
// imageUrl is null for brands without a logo.
export default async function getBrandImages(req, res) {
  try {
    res.status(200).json({ message: "Brand images retrieved successfully!", brands: await publicBrands() });
  } catch (error) {
    console.error("Error retrieving brand images:", error);
    res.status(500).json({ message: "Unable to load brands." });
  }
}
