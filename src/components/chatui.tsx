import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Avatar,
  Stack,
} from "@mui/material";
import { styled } from "@mui/system";
import { IoSend } from "react-icons/io5";
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

const ChatContainer = styled(Paper)(({ theme }) => ({
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

const MessageBubble = styled(Box)(({ isUser }: { isUser: boolean }) => ({
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "16px",
  flexDirection: isUser ? "row-reverse" : "row",
}));

const MessageContent = styled(Paper)(({ isUser }: { isUser: boolean }) => ({
  padding: "12px 16px",
  borderRadius: "16px",
  maxWidth: "70%",
  marginLeft: isUser ? 0 : "12px",
  marginRight: isUser ? "12px" : 0,
  backgroundColor: isUser ? "#2196f3" : "#f5f5f5",
  color: isUser ? "#fff" : "#000",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.02)",
  },
}));

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

  const handleKeyPress = (e) => {
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
                      customStyle={{
                        background: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "4px",
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
                {message.timestamp}
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
            onKeyPress={handleKeyPress}
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
              backgroundColor: "#2196f3",
              color: "#fff",
              "&:hover": {
                backgroundColor: "#1976d2",
              },
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