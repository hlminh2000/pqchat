import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

export default function Hero() {
  return (
    <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
      <Container maxWidth="md">
        <Typography variant="h2" component="h1" align="center" gutterBottom fontWeight="bold">
          Secure, Private, and Ephemeral Chats
        </Typography>
        <Typography variant="h5" align="center" color="text.secondary" paragraph>
          Experience true privacy with our P2P, E2E encrypted chat app.
          No storage, no traces, just secure conversations.
        </Typography>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            href="#get-started"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
          >
            Start Chatting Securely
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

