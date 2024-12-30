import { Box, Button, IconButton, styled, Tooltip, Typography, tooltipClasses, TooltipProps } from "@mui/material";
import { useEffect, useState } from "react";
import { BiInfoCircle } from "react-icons/bi";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { CopyAllOutlined } from "@mui/icons-material";

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    boxShadow: theme.shadows[1],
    fontSize: 11,
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.primary.main,
  },
}));

export const InfoButton = (props: { sessionUrl: string }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setOpen(true)
    }, 500)
    return () => clearTimeout(timeout)
  }, [])
  return (
    <StyledTooltip open={open} arrow title={
      <Box>
        <Box px={1} pb={1} pt={1}>
          <Typography> <strong>Ephemeral chat link:</strong> {props.sessionUrl}</Typography>
          <Box my={1}>
            <CopyToClipboard text={props.sessionUrl} onCopy={() => setOpen(false)}>
              <Button
                variant="outlined" 
                size="small" 
                // @ts-ignore
                color="white"
                startIcon={<CopyAllOutlined />}
              >
                  Copy
              </Button>
            </CopyToClipboard>
          </Box>
          <Typography> <strong>Send it to invite someone to chat. </strong></Typography>
        </Box>
      </Box>
    }>
      <IconButton size="small" color="primary" onClick={() => setOpen(!open)}>
        <BiInfoCircle size={24} />
      </IconButton>
    </StyledTooltip>
  )
}
