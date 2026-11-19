import { Suspense, useMemo } from "react";
import { Outlet } from "react-router";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useThemeMode } from "../../lib/store";
import Header from "../../components/Header";
import { Loader } from "../../components/ui/Bits";

/** Admin keeps its MUI screens; this theme makes them match the storefront. */
export default function AdminLayout() {
  const { mode } = useThemeMode();
  const theme = useMemo(() => {
    const dark = mode === "dark";
    return createTheme({
      palette: {
        mode,
        primary: { main: dark ? "#c6ff3d" : "#4a7a00", contrastText: dark ? "#0b0c0a" : "#ffffff" },
        secondary: { main: "#ff5a2b" },
        error: { main: dark ? "#ff5c5c" : "#c62828" },
        success: { main: dark ? "#5ff2a1" : "#157a48" },
        background: { default: dark ? "#0b0c0a" : "#f1f0ea", paper: dark ? "#121410" : "#ffffff" },
        text: { primary: dark ? "#eceee4" : "#111310", secondary: dark ? "#9ca191" : "#565b4f" },
        divider: dark ? "rgba(236,239,228,0.09)" : "rgba(17,19,16,0.1)",
      },
      shape: { borderRadius: 12 },
      typography: {
        fontFamily: '"Inter Tight", system-ui, sans-serif',
        h4: { fontFamily: '"Archivo", sans-serif', fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.02em" },
        h5: { fontFamily: '"Archivo", sans-serif', fontWeight: 800 },
        h6: { fontFamily: '"Archivo", sans-serif', fontWeight: 700 },
        button: { fontFamily: '"Archivo", sans-serif', fontWeight: 800, letterSpacing: "0.04em" },
      },
      components: {
        MuiButton: { styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } }, defaultProps: { disableElevation: true } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        MuiCard: { styleOverrides: { root: { border: `1px solid ${dark ? "rgba(236,239,228,0.09)" : "rgba(17,19,16,0.1)"}` } }, defaultProps: { elevation: 0 } },
        MuiDrawer: { styleOverrides: { paper: { backgroundColor: dark ? "#121410" : "#e8e7df", borderRight: "none" } } },
      },
    });
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <div className="app app--admin">
        <Header />
        <main className="admin-main">
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </ThemeProvider>
  );
}
