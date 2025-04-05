import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LanguageIcon from '@mui/icons-material/Language';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: Message = {
        id: Date.now().toString(),
        text: data.response,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };

      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 6 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          {t('chat')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('chatDescription')}
        </Typography>
      </Box>

      <Card
        sx={{
          height: 'calc(100vh - 300px)',
          display: 'flex',
          flexDirection: 'column',
          mb: 4,
        }}
      >
        <CardContent sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {messages.length === 0 ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
              }}
            >
              <ChatBubbleOutlineIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="body1">{t('startChatting')}</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      p: 2,
                      borderRadius: 2,
                      backgroundColor:
                        message.sender === 'user' ? 'primary.main' : 'grey.100',
                      color: message.sender === 'user' ? 'white' : 'text.primary',
                    }}
                  >
                    <Typography variant="body1">{message.text}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                        textAlign: 'right',
                      }}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </CardContent>

        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LanguageIcon fontSize="small" />
                    {t('language')}
                  </Box>
                </InputLabel>
                <Select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  label={t('language')}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                  <MenuItem value="zh">Chinese</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={9}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('typeMessage')}
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  sx={{
                    minWidth: 'auto',
                    px: 3,
                    boxShadow: '0 4px 12px rgba(53, 116, 244, 0.2)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(53, 116, 244, 0.3)',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    <SendIcon />
                  )}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Card>
    </Container>
  );
};

export default Chat; 