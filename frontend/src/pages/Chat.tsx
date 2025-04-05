import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Tabs,
  Tab,
  Alert,
  keyframes,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

interface Document {
  id: string;
  name: string;
}

interface Conference {
  id: string;
  start_time: string;
  parent_language: string;
  transcript_count: number;
  duration: string;
}

const LoadingBubble: React.FC = () => {
  const dotAnimation = keyframes`
    0%, 80%, 100% { 
      transform: scale(0);
    }
    40% { 
      transform: scale(1.0);
    }
  `;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        mb: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: '70%',
          backgroundColor: 'background.paper',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                animation: `${dotAnimation} 1.4s infinite ease-in-out`,
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                animation: `${dotAnimation} 1.4s infinite ease-in-out`,
                animationDelay: '0.2s',
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                animation: `${dotAnimation} 1.4s infinite ease-in-out`,
                animationDelay: '0.4s',
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedConference, setSelectedConference] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchData = async () => {
    try {
      const [documentsResponse, conferencesResponse] = await Promise.all([
        fetch('http://localhost:8000/documents', {
          credentials: 'include',
        }),
        fetch('http://localhost:8000/conferences', {
          credentials: 'include',
        }),
      ]);

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(documentsData);
      }

      if (conferencesResponse.ok) {
        const conferencesData = await conferencesResponse.json();
        setConferences(conferencesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when tab changes
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {  // Only scroll if there are messages
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (activeTab === 0 && !selectedDocument) return;
    if (activeTab === 1 && !selectedConference) return;

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
      const endpoint = activeTab === 0 ? '/query' : '/conference/query';
      const id = activeTab === 0 ? selectedDocument : selectedConference;

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [activeTab === 0 ? 'document_id' : 'conference_id']: id,
          question: input,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: Date.now().toString(),
        text: data.answer,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };

      setMessages([...messages, userMessage, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: t('chat.error'),
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages, userMessage, errorMessage]);
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSelectedDocument('');
    setSelectedConference('');
    setMessages([]);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {t('aiAssistant')}
        </Typography>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          centered
          sx={{ mb: 3 }}
        >
          <Tab
            icon={<DescriptionIcon />}
            label={t('chat.documents')}
            iconPosition="start"
          />
          <Tab
            icon={<MeetingRoomIcon />}
            label={t('chat.conferences')}
            iconPosition="start"
          />
        </Tabs>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{t('chat.selectLanguage')}</InputLabel>
                  <Select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    label={t('chat.selectLanguage')}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                    <MenuItem value="zh">Chinese</MenuItem>
                    <MenuItem value="ja">Japanese</MenuItem>
                    <MenuItem value="ko">Korean</MenuItem>
                    <MenuItem value="ru">Russian</MenuItem>
                    <MenuItem value="ar">Arabic</MenuItem>
                    <MenuItem value="hi">Hindi</MenuItem>
                    <MenuItem value="vi">Vietnamese</MenuItem>
                    <MenuItem value="th">Thai</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>
                    {activeTab === 0 ? t('chat.selectDocument') : t('chat.selectConference')}
                  </InputLabel>
                  <Select
                    value={activeTab === 0 ? selectedDocument : selectedConference}
                    onChange={(e) => {
                      if (activeTab === 0) {
                        setSelectedDocument(e.target.value);
                      } else {
                        setSelectedConference(e.target.value);
                      }
                    }}
                    label={activeTab === 0 ? t('chat.selectDocument') : t('chat.selectConference')}
                  >
                    {activeTab === 0
                      ? documents.map((doc) => (
                          <MenuItem key={doc.id} value={doc.id}>
                            {doc.name}
                          </MenuItem>
                        ))
                      : conferences.map((conf) => (
                          <MenuItem key={conf.id} value={conf.id}>
                            {new Date(conf.start_time).toLocaleString()} - {conf.parent_language}
                          </MenuItem>
                        ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {!selectedDocument && activeTab === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('chat.noDocumentSelected')}
          </Alert>
        )}

        {!selectedConference && activeTab === 1 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('chat.noConferenceSelected')}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ height: '400px', overflowY: 'auto', mb: 2 }}>
              {messages.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                  }}
                >
                  <ChatBubbleOutlineIcon sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="body1" align="center">
                    {t('startChatting')}
                  </Typography>
                </Box>
              ) : (
                <>
                  {messages.map((message: Message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Card
                        sx={{
                          maxWidth: '70%',
                          backgroundColor: message.sender === 'user' ? 'primary.main' : 'background.paper',
                          color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                        }}
                      >
                        <CardContent sx={{ pt: 1.5, pb: 1, px: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="body1">{message.text}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                  {loading && <LoadingBubble />}
                </>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chat.placeholder')}
                disabled={loading || (activeTab === 0 && !selectedDocument) || (activeTab === 1 && !selectedConference)}
              />
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={loading || !input.trim() || (activeTab === 0 && !selectedDocument) || (activeTab === 1 && !selectedConference)}
                sx={{ minWidth: '100px' }}
              >
                {loading ? <CircularProgress size={24} /> : t('send')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Chat; 