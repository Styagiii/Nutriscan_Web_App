import { createTheme } from '@mui/material/styles';

export const nutriTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3fff8b',
      light: '#6fffaa',
      dark: '#13ea79',
      contrastText: '#005d2c',
    },
    secondary: {
      main: '#00e3fd',
      light: '#5eeffb',
      dark: '#00b8d4',
      contrastText: '#003544',
    },
    background: {
      default: '#0a0e14',
      paper: '#151a21',
    },
    surface: {
      lowest: '#080c11',
      low: '#0f141a',
      main: '#151a21',
      high: '#1a2029',
      highest: '#20262f',
    },
    text: {
      primary: '#e8eaed',
      secondary: '#a8abb3',
    },
    divider: 'rgba(68, 72, 79, 0.15)',
    error: { main: '#ff6b6b' },
    warning: { main: '#ffb347' },
    success: { main: '#3fff8b' },
    info: { main: '#00e3fd' },
  },
  typography: {
    fontFamily: '"Manrope", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
    },
    subtitle2: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: '"Manrope", sans-serif',
      fontWeight: 400,
      lineHeight: 1.65,
    },
    body2: {
      fontFamily: '"Manrope", sans-serif',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    caption: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 500,
      letterSpacing: '0.04em',
    },
    button: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    overline: {
      fontFamily: '"Space Grotesk", "Manrope", sans-serif',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  shape: { borderRadius: 24 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a0e14',
          color: '#e8eaed',
          scrollbarWidth: 'thin',
          scrollbarColor: '#20262f #0a0e14',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#0a0e14' },
          '&::-webkit-scrollbar-thumb': {
            background: '#20262f',
            borderRadius: 3,
          },
        },
        '*': {
          boxSizing: 'border-box',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          padding: '10px 28px',
          fontSize: '0.9rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          background: 'linear-gradient(135deg, #3fff8b, #00e3fd)',
          color: '#005d2c',
          fontWeight: 700,
          boxShadow: '0 4px 20px -4px rgba(63, 255, 139, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #6fffaa, #5eeffb)',
            boxShadow: '0 8px 32px -4px rgba(63, 255, 139, 0.45)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: 'rgba(63, 255, 139, 0.3)',
          color: '#3fff8b',
          '&:hover': {
            borderColor: '#3fff8b',
            backgroundColor: 'rgba(63, 255, 139, 0.06)',
          },
        },
        text: {
          color: '#a8abb3',
          '&:hover': {
            backgroundColor: 'rgba(63, 255, 139, 0.06)',
            color: '#3fff8b',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#151a21',
          border: 'none',
          borderRadius: 24,
          boxShadow: '0 20px 40px -10px rgba(0, 227, 253, 0.06)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(21, 26, 33, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: 'none',
          boxShadow: '0 20px 40px -10px rgba(0, 227, 253, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 16,
            backgroundColor: '#0f141a',
            '& fieldset': {
              borderColor: 'rgba(68, 72, 79, 0.15)',
              transition: 'border-color 0.3s ease',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 227, 253, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(0, 227, 253, 0.4)',
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#151a21',
          borderRadius: 24,
          boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.6), 0 0 48px -8px rgba(0, 227, 253, 0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 500,
        },
        outlined: {
          borderColor: 'rgba(63, 255, 139, 0.2)',
          color: '#a8abb3',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          backgroundColor: '#1a2029',
        },
        bar: {
          borderRadius: 9999,
          background: 'linear-gradient(90deg, #3fff8b, #00e3fd)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: 'none',
        },
        standardInfo: {
          backgroundColor: 'rgba(0, 227, 253, 0.08)',
          color: '#a8abb3',
          '& .MuiAlert-icon': { color: '#00e3fd' },
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 179, 71, 0.08)',
          color: '#a8abb3',
          '& .MuiAlert-icon': { color: '#ffb347' },
        },
        standardError: {
          backgroundColor: 'rgba(255, 107, 107, 0.08)',
          color: '#a8abb3',
          '& .MuiAlert-icon': { color: '#ff6b6b' },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#a8abb3',
          '&.Mui-selected': {
            color: '#3fff8b',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1a2029',
          borderRadius: 16,
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 6px',
          '&:hover': {
            backgroundColor: 'rgba(63, 255, 139, 0.06)',
          },
        },
      },
    },
  },
});
