import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Container from '@mui/material/Container'
import GitHubIcon from '@mui/icons-material/GitHub'

export default function Footer() {
  return (
    <Box component="footer" sx={{ py: 6, bgcolor: 'grey.100' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: { xs: 'column', sm: 'column' } }}>
          <Box sx={{ mt: { xs: 2, sm: 0 }, mb: 2 }}>
            <Link href="https://github.com/quantropi-minh/ephem-chat" color="inherit">
              <GitHubIcon/>
            </Link>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {/* © 2023 EphemeralChat. All rights reserved. */}
            made with ❤️ from Ottawa, Canada
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {/* © 2023 EphemeralChat. All rights reserved. */}
            
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

