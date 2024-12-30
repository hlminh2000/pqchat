import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'

export default function CTA() {
  return (
    <Box id="get-started" sx={{ py: 8, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
      <Container maxWidth="md">
        <Typography variant="h3" component="h2" align="center" gutterBottom>
          Ready to Chat Securely?
        </Typography>
        <Typography variant="h5" align="center" paragraph>
          Experience the freedom of truly private conversations.
          No accounts, no history, just secure, ephemeral chats.
        </Typography>
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <a href='/chat' target="_blank">
            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'background.paper',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'grey.100',
                }
              }}
            >
              Launch EphemChat
            </Button>
          </a>
        </Box>
      </Container>
    </Box>
  )
}

