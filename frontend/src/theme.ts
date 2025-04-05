import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    display1: React.CSSProperties;
    display2: React.CSSProperties;
    display3: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    display1?: React.CSSProperties;
    display2?: React.CSSProperties;
    display3?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display1: true;
    display2: true;
    display3: true;
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#3574F4',
      light: '#5C8FF6',
      dark: '#2A5CC3',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1A1A1A',
      light: '#333333',
      dark: '#000000',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#F8F9FA',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    grey: {
      50: '#F9FAFB',
      100: '#F2F4F7',
      200: '#EAECF0',
      300: '#D0D5DD',
      400: '#98A2B3',
      500: '#667085',
      600: '#475467',
      700: '#344054',
      800: '#1D2939',
      900: '#101828',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '3.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h3: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.2,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.2,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.2,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.2,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    display1: {
      fontSize: '4.5rem',
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
    },
    display2: {
      fontSize: '3.75rem',
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
    },
    display3: {
      fontSize: '3rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 24px',
          fontSize: '1rem',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 12px rgba(53, 116, 244, 0.2)',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(53, 116, 244, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '32px 48px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

export default theme; 