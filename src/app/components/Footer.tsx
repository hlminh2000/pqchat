import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Container from '@mui/material/Container'
import GitHubIcon from '@mui/icons-material/GitHub'

export default function Footer() {
  return (
    <Box component="footer" sx={{ py: 6, bgcolor: 'grey.100' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
          <Typography variant="body2" color="text.secondary">
            © 2023 EphemeralChat. All rights reserved.
          </Typography>
          <Box sx={{ mt: { xs: 2, sm: 0 } }}>
            <Link href="https://github.com/quantropi-minh/ephem-chat" color="inherit" sx={{ mr: 2 }}>
              <GitHubIcon />
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

