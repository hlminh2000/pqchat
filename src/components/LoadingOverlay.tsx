import { Backdrop, Box, CircularProgress, Typography } from "@mui/material";

interface LoadingOverlayProps {
  open: boolean;
  message: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ open, message }) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
      }}
      open={open}
    >
      <CircularProgress color="inherit" size={60} thickness={4} />
      <Box mt={2}>
        <Typography variant="h6" component="div">
          {message}
        </Typography>
      </Box>
    </Backdrop>
  );
};