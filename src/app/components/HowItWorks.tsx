import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Timeline from '@mui/lab/Timeline'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'

const steps = [
  {
    title: "Create or Join a Chat",
    description: "Generate a unique link or enter one to join someone else."
  },
  {
    title: "Establish P2P Connection",
    description: "A secure peer-to-peer connection is established between participants."
  },
  {
    title: "Chat Securely",
    description: "All messages are encrypted end-to-end, ensuring complete privacy."
  },
  {
    title: "Messages Disappear",
    description: "Once read, messages vanish, leaving no trace on devices or servers."
  }
]

export default function HowItWorks() {
  return (
    <Box id="how-it-works" sx={{ py: 8, bgcolor: 'grey.50' }}>
      <Container maxWidth="md">
        <Typography variant="h3" component="h2" align="center" gutterBottom>
          How It Works
        </Typography>
        <Timeline position="alternate" sx={{ mt: 4 }}>
          {steps.map((step, index) => (
            <TimelineItem key={index}>
              <TimelineSeparator>
                <TimelineDot color="primary" />
                {index < steps.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="h6" component="h3">
                  {step.title}
                </Typography>
                <Typography color="text.secondary">{step.description}</Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Container>
    </Box>
  )
}

