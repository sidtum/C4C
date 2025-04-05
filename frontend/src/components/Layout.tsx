import React from 'react';
import { Box } from '@mui/material';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Navbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: { xs: 4, md: 6 },
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default Layout; 