import React, { useState, useEffect } from 'react';
import { Box, Chip, InputBase, Paper, Typography, InputLabel, FormControl } from '@mui/material';
import { Cancel as CancelIcon } from '@mui/icons-material';
import { formatInput } from '../utils';

// Utility function to check if the string is a valid color
const isValidColor = (color) => {
  const s = new Option().style;
  s.color = color;
  return s.color !== ''; // If the browser recognizes the color, it will assign it
};

// Utility function to get the appropriate text color (black or white) based on background color
const getTextColor = (bgColor) => {
  const div = document.createElement('div');
  div.style.color = bgColor;
  document.body.appendChild(div);
  const computedColor = window.getComputedStyle(div).color;
  document.body.removeChild(div);

  const rgb = computedColor.match(/\d+/g);
  const brightness = Math.round(((parseInt(rgb[0]) * 299) + (parseInt(rgb[1]) * 587) + (parseInt(rgb[2]) * 114)) / 1000);

  return brightness > 125 ? 'black' : 'white';
};

const BubbleSelector = ({ items, setItems, label = '', helperText = '', characterLimit, maxHeight = 64 }) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [totalCharacters, setTotalCharacters] = useState(0);

  // Calculate total characters based on the pre-fetched data
  useEffect(() => {
    const initialTotalCharacters = items.reduce((acc, item) => acc + item.length, 0);
    setTotalCharacters(initialTotalCharacters);
  }, [items]);

  const handleAddItem = () => {
    const formattedInput = formatInput(inputValue.trim());
    const newTotalCharacters = totalCharacters + formattedInput.length;

    if (formattedInput !== '' && !items.includes(formattedInput)) {
      // Check character limit only if passed
      if (!characterLimit || newTotalCharacters <= characterLimit) {
        const sortedItems = [...items, formattedInput].sort(); // Sort items alphabetically
        setItems(sortedItems);
        setTotalCharacters(newTotalCharacters); // Update total character count
        setInputValue(''); // Clear the input after adding the item
      }
    }
  };

  const handleRemoveItem = (itemToRemove) => {
    const sortedItems = items.filter((item) => item !== itemToRemove).sort(); // Remove and sort items
    setItems(sortedItems);
    setTotalCharacters(totalCharacters - itemToRemove.length); // Update total character count when a chip is removed
  };

  // Check if input exceeds limit only if the characterLimit is provided
  const inputExceedsLimit = characterLimit && totalCharacters + inputValue.length > characterLimit;

  return (
    <FormControl fullWidth sx={{ position: 'relative' }}>
      {/* Floating label */}
      <InputLabel
        shrink={isFocused || items.length > 0 || inputValue.length > 0} // Float when focused, input has value, or chips are added
        sx={{
          color: isFocused ? 'primary.main' : 'text.secondary',
          position: 'absolute',
          top: isFocused || items.length > 0 || inputValue.length > 0 ? '8px' : '16px', // Float label when needed
          transition: '0.2s ease',
          background: 'white',
          padding: '0 4px', // Background padding to cover behind label
          zIndex: 1, // Ensure it stays on top
        }}
      >
        {label}
      </InputLabel>

      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '8px',
          border: inputExceedsLimit ? '1px solid red' : '1px solid #ccc', // Turn red if the limit is exceeded
          borderRadius: '4px',
          minHeight: '56px', // Default height matching TextField
          marginTop: '8px', // Adjust for the floating label
          maxHeight: maxHeight,
          overflowY: 'auto',
        }}
      >
        {/* Displaying selected items as chips inside the input box */}
        {items.map((item, index) => (
          <Chip
            key={index}
            label={item}
            onDelete={() => handleRemoveItem(item)}
            deleteIcon={<CancelIcon />}
            sx={{
              margin: '4px',
              backgroundColor: isValidColor(item) ? item : 'default', // Apply the color if valid
              color: isValidColor(item) ? getTextColor(item) : 'default', // Set text color based on background
              border: '1px solid black', // Always add a border for better visibility
              '& .MuiChip-deleteIcon': {
                color: isValidColor(item) ? getTextColor(item) : 'default', // Apply the same color logic for the delete icon
              },
            }}
          />
        ))}

        {/* Input field for adding items */}
        <InputBase
          sx={{
            flex: 1,
            minWidth: '120px',
            margin: '4px',
          }}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddItem();
            }
          }}
        />
      </Paper>

      {/* Conditionally display the character count and helper text if characterLimit is provided */}
      {(helperText || characterLimit) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', marginBottom: '8px' }}>
          {/* Displaying helper text below the input */}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {helperText}
          </Typography>

          {/* Display character count if characterLimit is passed */}
          {characterLimit && (
            <Typography variant="caption" sx={{ color: inputExceedsLimit ? 'red' : 'text.secondary' }}>
              {totalCharacters}/{characterLimit} characters
            </Typography>
          )}
        </Box>
      )}
    </FormControl>
  );
};

export default BubbleSelector;