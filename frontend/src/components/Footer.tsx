import React from 'react';
import { Box, Typography, Container, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Parent Engagement App
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
            }}
          >
            <Link
              href="#"
              color="text.secondary"
              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              {t('privacyPolicy')}
            </Link>
            <Link
              href="#"
              color="text.secondary"
              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              {t('termsOfService')}
            </Link>
            <Link
              href="#"
              color="text.secondary"
              sx={{ textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
            >
              {t('contactUs')}
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 