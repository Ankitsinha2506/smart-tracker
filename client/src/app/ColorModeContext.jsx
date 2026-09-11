import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createTheme } from '@mui/material/styles';

const ColorModeContext = createContext(null);

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('smartapply-theme') || 'light');

  useEffect(() => {
    document.body.setAttribute('data-theme', mode);
    const favicon = document.getElementById('app-favicon');
    if (favicon) favicon.href = `/brand/favicon-${mode}.svg`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#091321' : '#3157d5');
  }, [mode]);

  const value = useMemo(() => {
    const isLight = mode === 'light';
    const theme = createTheme({
      palette: {
        mode,
        primary: {
          main: isLight ? '#2563eb' : '#93c5fd',
          light: isLight ? '#3b82f6' : '#a5b4fc',
          dark: isLight ? '#1d4ed8' : '#3b82f6',
        },
        secondary: {
          main: isLight ? '#0d9488' : '#2dd4bf',
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
          ? { default: 'transparent', paper: 'rgba(255, 255, 255, 0.75)' }
          : { default: 'transparent', paper: 'rgba(16, 20, 36, 0.72)' },
        divider: isLight ? 'rgba(226, 232, 240, 0.75)' : 'rgba(255, 255, 255, 0.09)',
        text: isLight
          ? { primary: '#1e293b', secondary: '#4b6078' }
          : { primary: '#f8fafc', secondary: '#b0c2d9' },
      },
      shape: { borderRadius: 8 },
      typography: {
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
              backgroundColor: isLight ? '#f1f3f9' : '#070913',
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
              background: 'linear-gradient(160deg, #60a5fa 0%, #2563eb 55%, #1d4ed8 100%)',
              boxShadow: '0 6px 20px -2px rgba(79, 70, 229, 0.4)',
              '&:hover': {
                background: 'linear-gradient(160deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 8px 24px -2px rgba(79, 70, 229, 0.55)',
                transform: 'translateY(-1px)',
              },
            },
            outlined: {
              borderColor: isLight ? 'rgba(99, 102, 241, 0.3)' : 'rgba(129, 140, 248, 0.35)',
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                borderColor: isLight ? '#2563eb' : '#93c5fd',
                backgroundColor: isLight ? 'rgba(99, 102, 241, 0.08)' : 'rgba(129, 140, 248, 0.1)',
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
                ? 'linear-gradient(145deg, rgba(255,255,255,.64), rgba(255,255,255,.08) 55%, rgba(220,237,255,.18))'
                : 'linear-gradient(145deg, rgba(191,219,254,.09), rgba(255,255,255,.01) 55%, rgba(56,189,248,.04))',
              backdropFilter: 'blur(24px) saturate(190%)',
              WebkitBackdropFilter: 'blur(24px) saturate(190%)',
              border: isLight
                ? '1px solid rgba(255, 255, 255, 0.85)'
                : '1px solid rgba(255, 255, 255, 0.10)',
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.48)' : 'rgba(15, 29, 49, 0.64)',
              boxShadow: isLight
                ? '0 12px 36px 0 rgba(31, 38, 135, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.6) inset'
                : '0 18px 45px 0 rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
            },
          },
        },
        MuiCard: { styleOverrides: { root: { borderRadius: 28 } } },
        MuiDialog: { styleOverrides: { paper: {
          borderRadius: 28,
          backgroundColor: isLight ? 'rgba(242,248,255,.93)' : 'rgba(16,29,49,.95)',
          backgroundImage: 'none',
          '@media (max-width: 599.95px)': { margin: 12, width: 'calc(100% - 24px)', maxWidth: 'calc(100% - 24px)', maxHeight: 'calc(100dvh - 24px)', borderRadius: 20 },
        } } },
        MuiDialogContent: { styleOverrides: { root: { minWidth: 0, '@media (max-width: 599.95px)': { paddingInline: 16 } } } },
        MuiDialogTitle: { styleOverrides: { root: { overflowWrap: 'anywhere', '@media (max-width: 599.95px)': { paddingInline: 16 } } } },
        MuiDialogActions: { styleOverrides: { root: { flexWrap: 'wrap', gap: 8, padding: 16, '& > :not(style) ~ :not(style)': { marginLeft: 0 } } } },
        MuiTablePagination: { styleOverrides: { toolbar: { flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, paddingBlock: 8 }, spacer: { flex: '1 1 0' }, actions: { marginLeft: 8 }, selectLabel: { marginBlock: 4 }, displayedRows: { marginBlock: 4 } } },
        MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(9,25,49,.32)', backdropFilter: 'blur(7px)' } } },
        MuiMenu: { styleOverrides: { paper: { backgroundColor: isLight ? 'rgba(245,250,255,.96)' : 'rgba(16,29,49,.96)' } } },
        MuiAutocomplete: { styleOverrides: { paper: { backgroundColor: isLight ? 'rgba(245,250,255,.97)' : 'rgba(16,29,49,.97)' } } },
        MuiIconButton: { styleOverrides: { root: { transition: 'background-color .2s, box-shadow .2s', '&.Mui-focusVisible': { outline: '3px solid #3b82f6', outlineOffset: 3 } } } },
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
                ? '1px solid rgba(115,145,181,.22)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              '& fieldset': { border: 'none' },
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.07)',
                borderColor: isLight ? '#3b82f6' : '#93c5fd',
              },
              '&.Mui-focused': {
                backgroundColor: isLight ? '#ffffff' : 'rgba(20, 26, 48, 0.9)',
                boxShadow: isLight
                  ? '0 0 0 3px rgba(99, 102, 241, 0.15)'
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
              backgroundColor: isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(15, 23, 42, 0.6)',
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
                  ? 'rgba(99, 102, 241, 0.04) !important'
                  : 'rgba(129, 140, 248, 0.06) !important',
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
              backgroundColor: isLight ? 'rgba(241, 245, 249, 0.75)' : 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(12px)',
              padding: 4,
              gap: 4,
              flexWrap: 'wrap',
              borderRadius: 16,
              '& .MuiToggleButtonGroup-grouped': { borderRadius: '11px !important', margin: '0 !important' },
              border: isLight
                ? '1px solid rgba(115,145,181,.22)'
                : '1px solid rgba(255, 255, 255, 0.08)',
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
                backgroundColor: isLight ? '#ffffff' : 'rgba(99, 102, 241, 0.25)',
                color: isLight ? '#2563eb' : '#a5b4fc',
                fontWeight: 750,
                boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.3)',
                '&:hover': {
                  backgroundColor: isLight ? '#ffffff' : 'rgba(99, 102, 241, 0.35)',
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
