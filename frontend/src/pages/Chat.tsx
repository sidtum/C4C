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
  Tabs,
  Tab,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LanguageIcon from '@mui/icons-material/Language';
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleDeleteConference = async (conferenceId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/conferences/${conferenceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conference');
      }

      // Update conferences list
      setConferences(conferences.filter(conf => conf.id !== conferenceId));
      
      // If the deleted conference was selected, clear the selection
      if (selectedConference === conferenceId) {
        setSelectedConference('');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conference:', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {t('chat.title')}
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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <Box>
                                <Typography>
                                  {conf.start_time ? new Date(conf.start_time).toLocaleString() : 'Invalid Date'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Duration: {conf.duration}
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConference(conf.id);
                                }}
                              >
                                Delete
                              </Button>
                            </Box>
                          </MenuItem>
                        ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, height: '400px', overflow: 'auto' }}>
          <CardContent>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    p: 2,
                    borderRadius: 2,
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'grey.200',
                    color: message.sender === 'user' ? 'white' : 'text.primary',
                  }}
                >
                  <Typography>{message.text}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chat.placeholder')}
            disabled={loading || (!selectedDocument && !selectedConference)}
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading || !input.trim() || (!selectedDocument && !selectedConference)}
            sx={{ minWidth: '100px' }}
          >
            {loading ? <CircularProgress size={24} /> : <SendIcon />}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Chat; 