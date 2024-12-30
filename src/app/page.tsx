'use client'

import CssBaseline from '@mui/material/CssBaseline'
import Header from './components/Header'
import Hero from './components/Hero'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import CTA from './components/CTA'
import Footer from './components/Footer'
import { AuthProvider } from '@/common/components/AuthProvider'
import { ThemeProvider } from '@/common/components/ThemeProvider'


export default function Home() {
  return (
    <AuthProvider>
      <ThemeProvider>
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
    </AuthProvider>
  )
}

