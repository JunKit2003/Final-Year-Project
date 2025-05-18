import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography, Checkbox, ListItemText, IconButton, Popover, FormControl, InputLabel, Select } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import BubbleSelector from '../components/BubbleSelector'; // Import BubbleSelector

const FilterSearch = ({ filters, onSearch, categoryOptions }) => {
  const [selectedFilters, setSelectedFilters] = useState(['name', 'price']); // Default filters: Name and Price
  const [searchQueries, setSearchQueries] = useState({
    category: [],
    name: '',
    brand: '',
    price: { min: '', max: '' },
    colors: [] // Added color filter as an array
  });
  const [priceError, setPriceError] = useState('');
  const [anchorEl, setAnchorEl] = useState(null); // State for Popover

  const handleIconClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'filter-popover' : undefined;

  // Handle adding/removing filters
  const handleAddFilter = (filter) => {
    if (selectedFilters.includes(filter)) {
      setSelectedFilters(selectedFilters.filter((f) => f !== filter));
    } else {
      setSelectedFilters([...selectedFilters, filter]);
    }
  };

  // Handle input changes
  const handleInputChange = (filter, value) => {
    setSearchQueries((prev) => ({
      ...prev,
      [filter]: value,
    }));
  };

  // Handle price range change
  const handlePriceChange = (field, value) => {
    setSearchQueries((prev) => ({
      ...prev,
      price: {
        ...prev.price,
        [field]: value,
      },
    }));
  };

  // Handle search
  const handleSearch = () => {
    setPriceError('');
    const { min, max } = searchQueries.price;

    // Validate price value
    if (min < 0 || max < 0) {
      setPriceError('Prices cannot be less than zero!');
      return;
    }

    if (min === max && (min !== '' || max !== '')) {
      setPriceError('Please enter different values for min and max prices!');
      return;
    }

    // Validate price range
    if (min !== '' && max !== '' && parseFloat(min) > parseFloat(max)) {
      setPriceError('Minimum price cannot be greater than maximum price!');
      return;
    }

    onSearch({
      searchQueries,
      selectedFilters,
    });
  };

  // Function to dynamically render filter inputs
  const renderFilterInputs = () => {
    return filters.map((filter) => {
      if (!selectedFilters.includes(filter.value)) return null;

      switch (filter.value) {
        case 'price':
          return (
            <Box key={filter.value} sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: '150px', width: '16vw', height: '64px' }}>
              <TextField
                label="Min Price"
                value={searchQueries.price.min}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                type="number"
                variant="outlined"
                sx={{ width: '25vw', height: '64px' }} // Uniform height
              />
              <TextField
                label="Max Price"
                value={searchQueries.price.max}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                type="number"
                variant="outlined"
                sx={{ width: '25vw', height: '64px' }} // Uniform height
              />
            </Box>
          );
        case 'color':
          return null; // Skip color handling here
        case 'category':
          return (
            <FormControl key={filter.value} sx={{ minWidth: '150px', width: '16vw', marginBottom: '24px' }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                multiple
                value={searchQueries.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                renderValue={(selected) => selected.join(', ')}
              >
                {categoryOptions.map((category) => (
                  <MenuItem key={category} value={category}>
                    <Checkbox checked={searchQueries.category.includes(category)} />
                    <ListItemText primary={category} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        default:
          return (
            <TextField
              key={filter.value}
              label={filter.label}
              value={searchQueries[filter.value]}
              onChange={(e) => handleInputChange(filter.value, e.target.value)}
              variant="outlined"
              sx={{ minWidth: '150px', width: '16vw', height: '64px' }} // Uniform height and scalable width
            />
          );
      }
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 2 }}>
      {/* Heading */}
      <Typography variant="h6">Search By</Typography>

      {/* Render dynamically generated filter inputs */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', width: '100%' }}>
        {renderFilterInputs()}
        {/* IconButton to open dropdown */}
        <IconButton onClick={handleIconClick} aria-describedby={id}>
          <FilterListIcon />
        </IconButton>
      </Box>

      {/* Always place the color filter on the next line */}
      {selectedFilters.includes('color') && (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '2px' }}>
          <Box sx={{ minWidth: '150px', width: '20vw', height: '64px', marginBottom: '24px' }}> {/* Add marginBottom */}
            <BubbleSelector
              items={searchQueries.colors}
              setItems={(items) => handleInputChange('colors', items)}
              label="Colors"
              helperText="Add colors (e.g., Red, Blue) by pressing Enter."
              maxHeight={64}
            />
          </Box>
        </Box>
      )}

      {/* Render Search button on a new line */}
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <Button variant="contained" onClick={handleSearch}>
          Search
        </Button>
      </Box>

      {/* Popover for filter checkboxes */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ padding: '8px' }}>
          {filters.map((filter) => (
            <MenuItem key={filter.value} onClick={() => handleAddFilter(filter.value)}>
              <Checkbox checked={selectedFilters.includes(filter.value)} />
              <ListItemText primary={filter.label} />
            </MenuItem>
          ))}
        </Box>
      </Popover>

      {/* Price range validation error */}
      {priceError && (
        <Typography color="error" variant="caption">
          {priceError}
        </Typography>
      )}
    </Box>
  );
};

export default FilterSearch;