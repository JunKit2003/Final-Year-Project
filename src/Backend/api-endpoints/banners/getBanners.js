import { publicBanners } from "../../features/banners/service.js";

// POST /api/banner/get: active banners in order (an empty list when there are none).
export default async function getBanners(req, res) {
  try {
    res.status(200).json({ message: "Banner images retrieved successfully!", banners: await publicBanners() });
  } catch (error) {
    console.error("Error retrieving banners:", error);
    res.status(500).json({ message: "Unable to load banners." });
  }
}
