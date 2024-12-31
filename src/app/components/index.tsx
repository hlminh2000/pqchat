'use client'

import CssBaseline from '@mui/material/CssBaseline'
import Header from './Header'
import Hero from './Hero'
import Features from './Features'
import HowItWorks from './HowItWorks'
import CTA from './CTA'
import Footer from './Footer'
import { ThemeProvider } from '@/common/components/ThemeProvider'
import { UserProvider } from '@auth0/nextjs-auth0/client';

export default function HomePage() {
  return (
    <UserProvider>
      <ThemeProvider>
        <CssBaseline />
        < Header />
        <main>
          <Hero />
          < Features />
          <HowItWorks />
          < CTA />
        </main>
        < Footer />
      </ThemeProvider>
    </UserProvider>
  )
}

