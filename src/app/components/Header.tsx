import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import { Lock } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
      <Box display="flex" alignItems="center" flexGrow={1}>
        <Lock sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="div" color="text.primary">
        EphemChat
        </Typography>
      </Box>
      <Box alignItems="center" display={{ xs: 'none', md: 'flex' }}>
        <Link href="#features" color="text.secondary" sx={{ mx: 2 }}>
        Features
        </Link>
        <Link href="#how-it-works" color="text.secondary" sx={{ mx: 2 }}>
        How It Works
        </Link>
        <Button variant="contained" color="primary" onClick={() => router.push("/chat")}>
        Start Chatting
        </Button>
      </Box>
      <Box alignItems="center" display={{ xs: 'flex', md: 'none' }}>
        <Button variant="contained" color="primary" onClick={() => router.push("/chat")}>
        Chat
        </Button>
      </Box>
      </Toolbar>
    </AppBar>
  )
}

