import React from "react";
import { Box } from "@mui/material";
import LoadingButton from "../LoadingButton";

const BannerView = ({ banners, handleDeleteBanner, isDeleting }) => {
    return (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center" }}>
            {banners.map((banner) => {
                const { imageUrl, id } = banner;

                return (
                    <Box
                        key={id}
                        sx={{
                            width: "300px",
                            border: "1px solid grey",
                            borderRadius: 2,
                            p: 2,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        {/* Display the banner image */}
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={`Banner ${id}`}
                                style={{
                                    width: "100%",
                                    height: "200px",
                                    objectFit: "cover",
                                    borderRadius: "10px",
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: "100%",
                                    height: "200px",
                                    background: "grey",
                                    borderRadius: "15px",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    color: "white",
                                    fontSize: "18px",
                                    fontWeight: "bold",
                                }}
                            >
                                No Image Available!
                            </Box>
                        )}

                        {/* Delete button */}
                        <LoadingButton
                            variant="outlined"
                            color="error"
                            onClick={() => handleDeleteBanner(id)}
                            isLoading={isDeleting}
                            sx={{ mt: 2 }}
                        >
                            Delete
                        </LoadingButton>
                    </Box>
                );
            })}
        </Box>
    );
};

export default BannerView;
