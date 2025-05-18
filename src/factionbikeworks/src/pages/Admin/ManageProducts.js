import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Typography, Dialog, DialogTitle } from "@mui/material";
import PopupDisplay from "../../components/PopupDisplay";
import Loading from "../../components/Loading";
import LoadingButton from "../../components/LoadingButton";
import ProductView from "../../components/Admin/ProductView";
import AddEditProductForm from "../../components/Admin/AddEditProductForm";
import FilterSearch from "../../components/FilterSearch";
import { formatInput } from "../../utils";

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [resetPage, setResetPage] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState(null);
  const [severity, setSeverity] = useState("error");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const autoHideDuration = 6000;

  const filters = [
    { label: "Category", value: "category" },
    { label: "Name", value: "name" },
    { label: "Brand", value: "brand" },
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/product/get`
      );
      const products = response.data.products || [];

      setProducts(products);
      setFilteredProducts(products);

      // Extract unique categories and format them
      const uniqueCategories = Array.from(
        new Set(products.map((product) => formatInput(product.category)))
      );
      setCategoryOptions(uniqueCategories);
    } catch (error) {
      console.log(error);
      setSnackbarMessage(
        error.response?.data?.message || "Error fetching products!"
      );
      setSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchCriteria) => {
    const { searchQueries, selectedFilters } = searchCriteria;

    let filtered = products;

    if (
      selectedFilters.includes("category") &&
      searchQueries.category.length > 0
    ) {
      filtered = filtered.filter((product) =>
        searchQueries.category.some(
          (selectedCategory) =>
            selectedCategory.toLowerCase() === product.category.toLowerCase()
        )
      );
    }

    if (selectedFilters.includes("name") && searchQueries.name) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQueries.name.toLowerCase())
      );
    }

    if (selectedFilters.includes("brand") && searchQueries.brand) {
      filtered = filtered.filter((product) =>
        product.brand.toLowerCase().includes(searchQueries.brand.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
    setResetPage(true);
  };

  const handleOpenForm = (product = null) => {
    setEditingProductId(product ? product.id : null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingProductId(null);
  };

  const handleSaveProduct = async (formData) => {
    setIsSaving(true);
  
    try {
      const url = editingProductId
        ? `${process.env.REACT_APP_BACKEND_HOST}/api/product/edit/${editingProductId}`
        : `${process.env.REACT_APP_BACKEND_HOST}/api/product/add`;
  
      await axios({
        method: editingProductId ? 'put' : 'post',
        url,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
  
      setSnackbarMessage(`Product ${editingProductId ? 'updated' : 'added'} successfully!`);
      setSeverity('success');
      setOpenSnackbar(true);
      fetchProducts();
      handleCloseForm();
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message || 'Error saving product!'
      );
      setSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };
  

  const handleDeleteProduct = async (id) => {
    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_HOST}/api/product/delete/${id}`
      );
      setSnackbarMessage("Product deleted successfully!");
      setSeverity("success");
      setOpenSnackbar(true);
      setProducts(products.filter((p) => p.id !== id));
      setFilteredProducts(filteredProducts.filter((p) => p.id !== id));
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message || "Error deleting product!"
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: 3,
        boxSizing: "border-box",
      }}
    >
      {/* Title and Add Product Button */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4">Manage Products</Typography>
        <LoadingButton
          variant="contained"
          color="primary"
          onClick={() => handleOpenForm()}
          isLoading={isSaving}
          sx={{ mt: 2 }}
        >
          Add Product
        </LoadingButton>
      </Box>

      {/* Search and Filter Component */}
      <FilterSearch
        filters={filters}
        onSearch={handleSearch}
        categoryOptions={categoryOptions}
      />

      <ProductView
        products={filteredProducts}
        handleOpenForm={handleOpenForm}
        handleDeleteProduct={handleDeleteProduct}
        isDeleting={isDeleting}
        itemsPerPage={50}
        resetPage={resetPage}
      />

      {/* Dialog for adding or editing product */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProductId ? "Edit Product" : "Add Product"}
        </DialogTitle>
        <AddEditProductForm
          initialProductData={
            editingProductId
              ? products.find((p) => p.id === editingProductId)
              : {
                  category: "",
                  name: "",
                  brand: "",
                  description: "",
                  variations: [], // Initialize variations as empty array
                }
          }
          handleSaveProduct={handleSaveProduct}
          handleCloseForm={handleCloseForm}
          isSaving={isSaving}
        />
      </Dialog>

      {/* Snackbar for displaying errors or success messages */}
      <PopupDisplay
        message={snackbarMessage}
        severity={severity}
        open={openSnackbar}
        onClose={handleCloseSnackbar}
        autoHideDuration={autoHideDuration}
      />
    </Box>
  );
};

export default ManageProducts;
