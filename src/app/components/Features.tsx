import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import { Shield, Bolt, RemoveRedEye } from '@mui/icons-material'
import { BiShield } from 'react-icons/bi'

const features = [
  {
    icon: Shield,
    title: "End-to-End PQC Encryption",
    description: "Your messages are Quantum-securely encrypted from the moment you hit send until they reach the recipient."
  },
  {
    icon: Bolt,
    title: "Peer-to-Peer",
    description: "Direct communication between users without any intermediary servers."
  },
  {
    icon: RemoveRedEye,
    title: "Ephemeral Messages",
    description: "Messages disappear after being read, leaving no trace behind."
  }
]

export default function Features() {
  return (
    <Box>
      <Box id="features" sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" align="center" gutterBottom>
            Key Features
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <feature.icon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      <Box id="pqc" sx={{ py: 8, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <BiShield style={{ fontSize: 64 * 1.5, color: 'white', marginBottom: 2 * 8 }} />
            <Typography variant="h3" component="h3" gutterBottom>
              Post-Quantum Encryption
            </Typography>
            <Typography variant="h5" color="text.contrastText">
              With state-of-the-art Post-Quantum Cryptography, even a quantum computer won't break into your chat.
            </Typography>
            <Box mt={2}>
              <Typography variant="body1" color="grey-200">
                Your AES-256 encryption key is exchanged using NIST-compliant CRYSTALS-Kyber Key Encapsulation Mechanism
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

