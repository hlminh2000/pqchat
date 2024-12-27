import { Box, Button, IconButton, styled, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { BiInfoCircle } from "react-icons/bi";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { IoClose, IoCloseCircle } from "react-icons/io5";

const StyledTooltip = styled(Tooltip)`
    & .MuiTooltip-tooltip {
    background: transparent;
    padding: 0;
    min-width: fit-content;
  }
`;

export const InfoButton = (props: { sessionUrl: string }) => {
  const [open, setOpen] = useState(true);
  return (
    <StyledTooltip open={open} arrow title={
      <Box>
        <Box display={"flex"} justifyContent={"flex-end"}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            <IoClose size={24} />
          </IconButton>
        </Box>
        <Box px={1} pb={1}>
          <Typography> <strong>My address:</strong> {props.sessionUrl}</Typography>
          <Box mt={1}>
            <CopyToClipboard text={props.sessionUrl} onCopy={() => setOpen(false)}>
              <Button variant="outlined" size="small" color="white">Copy</Button>
            </CopyToClipboard>
          </Box>
        </Box>
      </Box>
    }>
      <IconButton size="small" color="primary" onClick={() => setOpen(!open)}>
        <BiInfoCircle size={24} />
      </IconButton>
    </StyledTooltip>
  )
}