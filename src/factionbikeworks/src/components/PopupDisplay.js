// src/components/Popup.js
import React from 'react';
import { Alert, AlertTitle, Snackbar } from '@mui/material';

const PopupDisplay = ({ message, severity = 'error', onClose, open, autoHideDuration = 6000 }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Position at the top-center
    >
      {message && (
        <Alert severity={severity} onClose={onClose ? () => onClose() : null}>
          <AlertTitle>{severity === 'error' ? 'Error' : severity.charAt(0).toUpperCase() + severity.slice(1)}</AlertTitle>
          {message}
        </Alert>
      )}
    </Snackbar>
  );
};

export default PopupDisplay;