import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import { Lock } from '@mui/icons-material'
import { useUser } from '@auth0/nextjs-auth0/client'

export default function Header() {
  const { isLoading, user } = useUser();
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Box display="flex" alignItems="center" flexGrow={1}>
          <Lock sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div" color="text.primary">
            PQChat
          </Typography>
        </Box>
        <Box alignItems="center" display={{ xs: 'none', md: 'flex' }}>
          <Link href="#features" color="text.secondary" sx={{ mx: 2 }}>
            Features
          </Link>
          <Link href="#how-it-works" color="text.secondary" sx={{ mx: 2 }}>
            How It Works
          </Link>
          {!isLoading && !!user && (
            <Box mx={2}>
              <Link href="/api/auth/logout">
                <Button variant="outlined" color="error">
                  Logout
                </Button>
              </Link>
            </Box>
          )}
          <Link href="/chat">
            <Button variant="contained" color="primary">
              Start Chatting
            </Button>
          </Link>
        </Box>
        <Box alignItems="center" display={{ xs: 'flex', md: 'none' }}>
          <Link href="/chat">
            <Button variant="contained" color="primary">
              Chat
            </Button>
          </Link>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

