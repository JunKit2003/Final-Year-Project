// src/components/LoadingButton.js
import React from 'react';
import { Button, CircularProgress } from '@mui/material';

const LoadingButton = ({ isLoading, children, ...props }) => {
  return (
    <Button {...props} disabled={isLoading}>
      {isLoading ? <CircularProgress size={24} /> : children}
    </Button>
  );
};

export default LoadingButton;