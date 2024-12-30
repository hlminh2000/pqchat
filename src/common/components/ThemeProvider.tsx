import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material"

const theme = createTheme({
  palette: {
    primary: {
      // main: '#2196f3',
      main: '#000000',
    },
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Inter, Arial, sans-serif',
  },
})

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <MuiThemeProvider theme={theme}>
      {children}
    </MuiThemeProvider>
  )
}
