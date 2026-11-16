import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTheme } from '@mui/material/styles';

const ColorModeContext = createContext(null);

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('smartapply-theme') || 'light');

  useEffect(() => {
    document.body.setAttribute('data-theme', mode);
    const favicon = document.getElementById('app-favicon');
    if (favicon) favicon.href = `/brand/favicon-${mode}.svg`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#080b20' : '#f5f3ff');
  }, [mode]);

  const value = useMemo(() => {
    const isLight = mode === 'light';
    const theme = createTheme({
      palette: {
        mode,
        primary: {
          main: isLight ? '#642dff' : '#a78bfa',
          light: isLight ? '#8b68ff' : '#c4b5fd',
          dark: isLight ? '#4b1fd1' : '#7c3aed',
        },
        secondary: {
          main: isLight ? '#4f46e5' : '#8b7cff',
        },
        success: {
          main: isLight ? '#10b981' : '#34d399',
        },
        warning: {
          main: isLight ? '#f59e0b' : '#fbbf24',
        },
        info: {
          main: isLight ? '#0284c7' : '#38bdf8',
        },
        background: isLight
          ? { default: 'transparent', paper: 'rgba(255, 255, 255, 0.82)' }
          : { default: 'transparent', paper: 'rgba(12, 16, 43, 0.82)' },
        divider: isLight ? 'rgba(213, 207, 239, 0.76)' : 'rgba(167, 139, 250, 0.16)',
        text: isLight
          ? { primary: '#11132f', secondary: '#555774' }
          : { primary: '#f7f5ff', secondary: '#b9b5d4' },
      },
      shape: { borderRadius: 8 },
      typography: {
        fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        h1: { fontWeight: 850, letterSpacing: '-0.045em' },
        h2: { fontWeight: 850, letterSpacing: '-0.04em' },
        h3: { fontWeight: 800, letterSpacing: '-0.035em' },
        h4: { fontWeight: 800, letterSpacing: '-0.03em' },
        h5: { fontWeight: 750, letterSpacing: '-0.025em' },
        h6: { fontWeight: 750, letterSpacing: '-0.02em' },
        subtitle1: { fontWeight: 650 },
        subtitle2: { fontWeight: 650 },
        body1: { fontSize: '0.945rem', lineHeight: 1.6 },
        body2: { fontSize: '0.865rem', lineHeight: 1.55 },
        button: { fontWeight: 700, textTransform: 'none', letterSpacing: '0.01em' },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: isLight ? '#f7f5ff' : '#080b20',
            },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: {
              minHeight: 40,
              borderRadius: 99,
              paddingInline: 18,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            },
            containedPrimary: {
              background: 'linear-gradient(145deg, #8056ff 0%, #642dff 58%, #5420e9 100%)',
              boxShadow: '0 8px 24px -8px rgba(100, 45, 255, 0.56)',
              '&:hover': {
                background: 'linear-gradient(145deg, #7042f4 0%, #5120dc 100%)',
                boxShadow: '0 10px 28px -8px rgba(100, 45, 255, 0.66)',
                transform: 'translateY(-1px)',
              },
            },
            outlined: {
              borderColor: isLight ? 'rgba(100, 45, 255, 0.25)' : 'rgba(167, 139, 250, 0.35)',
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.64)' : 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                borderColor: isLight ? '#642dff' : '#a78bfa',
                backgroundColor: isLight ? 'rgba(100, 45, 255, 0.07)' : 'rgba(129, 140, 248, 0.1)',
                transform: 'translateY(-1px)',
              },
            },
          },
        },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              borderRadius: 24,
              backgroundImage: isLight
                ? 'linear-gradient(145deg, rgba(255,255,255,.86), rgba(255,255,255,.42) 55%, rgba(237,231,255,.38))'
                : 'linear-gradient(145deg, rgba(167,139,250,.12), rgba(255,255,255,.01) 55%, rgba(99,76,196,.08))',
              backdropFilter: 'blur(24px) saturate(190%)',
              WebkitBackdropFilter: 'blur(24px) saturate(190%)',
              border: isLight
                ? '1px solid rgba(255, 255, 255, 0.85)'
                : '1px solid rgba(255, 255, 255, 0.10)',
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(12, 16, 43, 0.78)',
              boxShadow: isLight
                ? '0 12px 36px 0 rgba(59, 43, 115, 0.07), 0 0 0 1px rgba(255, 255, 255, 0.7) inset'
                : '0 18px 45px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(167, 139, 250, 0.08) inset',
            },
          },
        },
        MuiCard: { styleOverrides: { root: { borderRadius: 28 } } },
        MuiDialog: { styleOverrides: { paper: {
          borderRadius: 28,
          backgroundColor: isLight ? 'rgba(250,248,255,.96)' : 'rgba(14,17,45,.97)',
          backgroundImage: 'none',
          '@media (max-width: 599.95px)': { margin: 12, width: 'calc(100% - 24px)', maxWidth: 'calc(100% - 24px)', maxHeight: 'calc(100dvh - 24px)', borderRadius: 20 },
        } } },
        MuiDialogContent: { styleOverrides: { root: { minWidth: 0, '@media (max-width: 599.95px)': { paddingInline: 16 } } } },
        MuiDialogTitle: { styleOverrides: { root: { overflowWrap: 'anywhere', '@media (max-width: 599.95px)': { paddingInline: 16 } } } },
        MuiDialogActions: { styleOverrides: { root: { flexWrap: 'wrap', gap: 8, padding: 16, '& > :not(style) ~ :not(style)': { marginLeft: 0 } } } },
        MuiTablePagination: { styleOverrides: { toolbar: { flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, paddingBlock: 8 }, spacer: { flex: '1 1 0' }, actions: { marginLeft: 8 }, selectLabel: { marginBlock: 4 }, displayedRows: { marginBlock: 4 } } },
        MuiBackdrop: { styleOverrides: { invisible: { backdropFilter: 'none', backgroundColor: 'transparent' }, root: { backgroundColor: 'rgba(9,25,49,.32)', backdropFilter: 'blur(7px)' } } },
        MuiMenu: { styleOverrides: { paper: { backgroundColor: isLight ? 'rgba(250,248,255,.98)' : 'rgba(14,17,45,.98)' } } },
        MuiAutocomplete: { styleOverrides: { paper: { backgroundColor: isLight ? 'rgba(250,248,255,.98)' : 'rgba(14,17,45,.98)' } } },
        MuiIconButton: { styleOverrides: { root: { transition: 'background-color .2s, box-shadow .2s', '&.Mui-focusVisible': { outline: '3px solid #7c52ff', outlineOffset: 3 } } } },
        MuiAlert: { styleOverrides: { root: { borderRadius: 16, border: '1px solid', borderColor: 'inherit' } } },
        MuiTextField: { defaultProps: { fullWidth: true }, styleOverrides: { root: { minWidth: 0 } } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 14,
              minHeight: 46,
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(12px)',
              border: isLight
                ? '1px solid rgba(204,194,239,.62)'
                : '1px solid rgba(167, 139, 250, 0.15)',
              '& fieldset': { border: 'none' },
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.07)',
                borderColor: isLight ? '#642dff' : '#a78bfa',
              },
              '&.Mui-focused': {
                backgroundColor: isLight ? '#ffffff' : 'rgba(20, 26, 48, 0.9)',
                boxShadow: isLight
                  ? '0 0 0 3px rgba(100, 45, 255, 0.15)'
                  : '0 0 0 3px rgba(129, 140, 248, 0.2)',
              },
            },
          },
        },
        MuiTable: { styleOverrides: { root: { minWidth: 640 } } },
        MuiTableContainer: { defaultProps: { tabIndex: 0 }, styleOverrides: { root: { borderRadius: 20, maxWidth: '100%', overflowX: 'auto' } } },
        MuiTableHead: {
          styleOverrides: {
            root: {
              backgroundColor: isLight ? 'rgba(244, 242, 251, 0.8)' : 'rgba(15, 16, 43, 0.68)',
              backdropFilter: 'blur(8px)',
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderColor: isLight ? 'rgba(226, 232, 240, 0.7)' : 'rgba(255, 255, 255, 0.07)',
            },
            head: {
              fontWeight: 800,
              fontSize: '0.82rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: isLight ? '#475569' : '#b0c2d9',
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              transition: 'background-color 0.15s ease',
              '&:hover': {
                backgroundColor: isLight
                  ? 'rgba(100, 45, 255, 0.045) !important'
                  : 'rgba(167, 139, 250, 0.08) !important',
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
            },
          },
        },
        MuiInputLabel: { styleOverrides: { root: { fontSize: '0.85rem', fontWeight: 600 } } },
        MuiToggleButtonGroup: {
          styleOverrides: {
            root: {
              backgroundColor: isLight ? 'rgba(247, 245, 255, 0.88)' : 'rgba(255, 255, 255, 0.045)',
              backdropFilter: 'blur(12px)',
              padding: 4,
              gap: 4,
              flexWrap: 'wrap',
              borderRadius: 16,
              '& .MuiToggleButtonGroup-grouped': { borderRadius: '11px !important', margin: '0 !important' },
              border: isLight
                ? '1px solid rgba(204,194,239,.62)'
                : '1px solid rgba(167, 139, 250, 0.15)',
            },
          },
        },
        MuiToggleButton: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              border: 'none !important',
              margin: 0,
              padding: '7px 13px',
              fontSize: '0.78rem',
              textTransform: 'none',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                background: isLight ? 'linear-gradient(145deg, #7546ff, #5b2ae8)' : 'linear-gradient(145deg, #7d56ff, #5322da)',
                color: '#ffffff',
                fontWeight: 750,
                boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.3)',
                '&:hover': {
                  backgroundColor: isLight ? '#ffffff' : 'rgba(124, 82, 255, 0.35)',
                },
              },
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              borderRadius: 10,
              fontSize: 12,
              backdropFilter: 'blur(12px)',
              backgroundColor: isLight ? 'rgba(15, 23, 42, 0.88)' : 'rgba(30, 41, 59, 0.92)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            },
          },
        },
      },
    });

    const toggleMode = () =>
      setMode((current) => {
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem('smartapply-theme', next);
        return next;
      });

    return { mode, theme, toggleMode };
  }, [mode]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error('useColorMode must be used inside ColorModeProvider');
  return context;
}
