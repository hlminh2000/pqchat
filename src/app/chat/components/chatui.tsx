import React, { useState, useRef, useEffect, KeyboardEventHandler } from "react";
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Avatar,
  Stack,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/system";
import { IoSend } from "react-icons/io5";
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import dayjs from "dayjs";

const ChatContainer = styled(Paper)(() => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
}));

const MessagesContainer = styled(Box)({
  flex: 1,
  overflowY: "auto",
  padding: "20px",
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#f1f1f1",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#888",
    borderRadius: "3px",
  },
});

type MessageBubbleStyleProp = { isUser: boolean }
const MessageBubble = styled
(({ isUser, ...rest }: MessageBubbleStyleProp & React.ComponentProps<typeof Box>) => <Box {...rest} />) // avoids passing `isUser` to the DOM
(({ isUser }: MessageBubbleStyleProp) => ({
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "16px",
  flexDirection: isUser ? "row-reverse" : "row",
}));

const MessageContent = styled
(({ isUser, ...rest }: MessageBubbleStyleProp & React.ComponentProps<typeof Paper>) => <Paper {...rest} />) // avoids passing `isUser` to the DOM
(({ isUser }: MessageBubbleStyleProp) => {
  return ({
  padding: "12px 16px",
  borderRadius: "16px",
  maxWidth: "70%",
  marginLeft: isUser ? 0 : "12px",
  marginRight: isUser ? "12px" : 0,
  backgroundColor: isUser ? "#000" : "#f5f5f5",
  color: isUser ? "#fff" : "#000",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.02)",
  },
})});

const InputContainer = styled(Box)({
  padding: "20px",
  borderTop: "1px solid rgba(0, 0, 0, 0.1)",
});

export type ChatMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  avatar: string;
}

const ChatUI = (props: {
  messages: ChatMessage[],
  sendMessage: (message: string) => Promise<void>;
  enabled: boolean;
}) => {
  const { messages = [], sendMessage, enabled } = props;
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage("");
    }
  };

  const handleKeyPress: KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ChatContainer>
      <MessagesContainer>
        {messages.map((message) => (
          <MessageBubble key={message.id} isUser={message.isUser}>
            <Avatar
              src={message.avatar}
              alt={message.isUser ? "User" : "Contact"}
              sx={{
                width: 40,
                height: 40,
              }}
            />
            <MessageContent isUser={message.isUser}>
              <Markdown
                components={{
                  code(props) {
                    const { children, className, node, ...rest } = props
                    const match = /language-(\w+)/.exec(className || '')
                    return <SyntaxHighlighter
                      {...rest}
                      style={dark}
                      customStyle={{
                        background: "rgba(0, 0, 0, 0.9)",
                        border:"solid 2px white",
                        borderRadius: "10px",
                        padding: '0.6em',
                      }}
                      codeTagProps={{
                        style: {
                          textShadow: "none"
                        }
                      }}
                      showLineNumbers
                      PreTag="div"
                      children={String(children).replace(/\n$/, '')}
                      language={match?.[1]}
                    />
                  }
                }}

              >{message.text}</Markdown>
              <Typography
                variant="caption"
                sx={{ opacity: 0.7, mt: 0.5, display: "block" }}
              >
                {dayjs(message.timestamp).format("HH:mm a")}
              </Typography>
            </MessageContent>
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <InputContainer>
        <Stack direction="row" spacing={2} alignItems={"flex-end"}>
          <TextField
            disabled={!enabled}
            fullWidth
            multiline
            maxRows={4}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            variant="outlined"
            size="small"
            sx={{
              backgroundColor: "#fff",
              "& .MuiOutlinedInput-root": {
                borderRadius: "24px",
              }
            }}
            aria-label="Message input field"
          />
          <IconButton
            disabled={!enabled}
            onClick={handleSendMessage}
            color="primary"
            aria-label="Send message"
            sx={{
              height: "40px",
              backgroundColor: theme.palette.primary.main,
              color: "#fff",
            }}
          >
            <IoSend />
          </IconButton>
        </Stack>
      </InputContainer>
    </ChatContainer>
  );
};

export default ChatUI;