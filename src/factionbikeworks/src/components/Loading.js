// src/components/Loading.js
import React from 'react';
import { CircularProgress, Box } from '@mui/material';

const Loading = ({ size = 40 }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh', // This makes it full screen
      }}
    >
      <CircularProgress size={size} />
    </Box>
  );
};

export default Loading;