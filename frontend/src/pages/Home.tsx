import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

  const features = [
    {
      icon: <DescriptionIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: t('documents'),
      description: t('documentsDescription'),
      path: '/documents',
    },
    {
      icon: <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: t('aiAssistant'),
      description: t('aiAssistantDescription'),
      path: '/chat',
    },
    {
      icon: <EventIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      title: t('conferences'),
      description: t('conferencesDescription'),
      path: '/conferences',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: { xs: 8, md: 12 },
          mb: 8,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 700,
                  mb: 3,
                  lineHeight: 1.2,
                }}
              >
                {t('welcomeTitle')}
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  opacity: 0.9,
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                }}
              >
                {t('welcomeDescription')}
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/documents')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'grey.100',
                  },
                }}
              >
                {t('getStarted')}
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <SchoolIcon
                  sx={{
                    fontSize: { xs: 200, md: 300 },
                    opacity: 0.2,
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 12 }}>
        <Typography
          variant="h2"
          sx={{
            textAlign: 'center',
            mb: 6,
            fontSize: { xs: '2rem', md: '2.5rem' },
          }}
        >
          {t('features')}
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 4,
                  }}
                >
                  <Box sx={{ mb: 3 }}>{feature.icon}</Box>
                  <Typography
                    variant="h5"
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    {feature.description}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(feature.path)}
                    sx={{ mt: 'auto' }}
                  >
                    {t('learnMore')}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Home; 