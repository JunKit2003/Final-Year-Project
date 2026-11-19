import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import PopupDisplay from "../../components/PopupDisplay";
import Loading from "../../components/Loading";
import LoadingButton from "../../components/LoadingButton";
import BannerView from "../../components/Admin/BannerView";
import AddBannerForm from "../../components/Admin/AddBannerForm";
import { API_BASE } from "../../lib/api";

const ManageBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState(null);
    const [severity, setSeverity] = useState("error");
    const [openSnackbar, setOpenSnackbar] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const response = await axios.post(
                `${API_BASE}/api/banner/get`
            );
            const bannersWithCorrectUrls = response.data.banners.map(banner => ({
                ...banner,
                imageUrl: `${API_BASE}${banner.imageUrl}`,
            }));
            setBanners(bannersWithCorrectUrls || []);
        } catch (error) {
            setSnackbarMessage(
                error?.response?.data?.message || "Error fetching banners!"
            );
            setSeverity("error");
            setOpenSnackbar(true);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = () => {
        setOpenForm(true); // Open the form for adding a new banner
    };

    const handleCloseForm = () => {
        setOpenForm(false); // Close the form
    };

	const handleSaveBanners = async (formData) => {
		setIsSaving(true);
		try {
			await axios.post(
				`${API_BASE}/api/banner/add`,
				formData,
				{ headers: { "Content-Type": "multipart/form-data" } }
			);
	
			setSnackbarMessage("Banner added successfully!");
			setSeverity("success");
			setOpenSnackbar(true);
			fetchBanners(); // Fetch updated banners
			handleCloseForm(); // Close the form
		} catch (error) {
			setSnackbarMessage(
				error?.response?.data?.message || "Error saving banner!"
			);
			setSeverity("error");
			setOpenSnackbar(true);
		} finally {
			setIsSaving(false);
		}
	};
	
	

    const handleDeleteBanner = async (id) => {
        setIsDeleting(true);
        try {
            await axios.delete(
                `${API_BASE}/api/banner/delete/${id}`
            );
            setSnackbarMessage("Banner deleted successfully!");
            setSeverity("success");
            setOpenSnackbar(true);
            setBanners(banners.filter((b) => b.id !== id)); // Remove the deleted banner from the state
        } catch (error) {
            setSnackbarMessage(
                error?.response?.data?.message || "Error deleting banner!"
            );
            setSeverity("error");
            setOpenSnackbar(true);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
        setSnackbarMessage(null);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: 3 }}>
            <Box sx={{ mb: 2 }}>
                <Typography variant="h4">Manage Banners</Typography>
                <LoadingButton
                    variant="contained"
                    color="primary"
                    onClick={handleOpenForm} // Open the form for adding a new banner
                    isLoading={isSaving}
                    sx={{ mt: 2 }}
                >
                    Add Banner
                </LoadingButton>
            </Box>

            <BannerView
                banners={banners}
                handleDeleteBanner={handleDeleteBanner} // Keep delete functionality
                isDeleting={isDeleting}
            />

            <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
                <DialogTitle>Add Banner</DialogTitle>
                <AddBannerForm
                    handleSaveBanners={handleSaveBanners}
                    handleCloseForm={handleCloseForm}
                    isSaving={isSaving}
                />
            </Dialog>

            <PopupDisplay
                message={snackbarMessage}
                severity={severity}
                open={openSnackbar}
                onClose={handleCloseSnackbar}
            />
        </Box>
    );
};

export default ManageBanners;
