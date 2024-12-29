'use client'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import CTA from './components/CTA'
import Footer from './components/Footer'
import { Auth0Provider } from '@auth0/auth0-react'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Inter, Arial, sans-serif',
  },
})

export default function Home() {
  return (
    <Auth0Provider
      domain="dev-48o35gs7coyf2b7q.us.auth0.com"
      clientId="9oVYYrTOPB4nkUcCFv1AkD99UacrXKqH"
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Header />
        <main>
          <Hero />
          <Features />
          <HowItWorks />
          <CTA />
        </main>
        <Footer />
      </ThemeProvider>
    </Auth0Provider>
  )
}

