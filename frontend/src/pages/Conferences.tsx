import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';

interface Conference {
  id: string;
  date: string;
  duration: string;
  summary: string;
  language: string;
}

const Conferences: React.FC = () => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    // Fetch conferences from backend
    fetchConferences();
  }, []);

  const fetchConferences = async () => {
    try {
      const response = await fetch('http://localhost:8000/conferences');
      if (!response.ok) throw new Error('Failed to fetch conferences');
      const data = await response.json();
      setConferences(data);
    } catch (error) {
      console.error('Error fetching conferences:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', selectedLanguage);

        setLoading(true);
        try {
          const response = await fetch('http://localhost:8000/process-audio', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Failed to process audio');
          const data = await response.json();
          setConferences([data, ...conferences]);
        } catch (error) {
          console.error('Error processing audio:', error);
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleDelete = async (conferenceId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/conferences/${conferenceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete conference');
      setConferences(conferences.filter(conf => conf.id !== conferenceId));
    } catch (error) {
      console.error('Error deleting conference:', error);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 6 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          {t('conferences')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('conferenceDescription')}
        </Typography>
      </Box>

      <Box sx={{ mb: 6 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>{t('selectLanguage')}</InputLabel>
              <Select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                label={t('selectLanguage')}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="zh">Chinese</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              startIcon={isRecording ? <StopIcon /> : <MicIcon />}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(53, 116, 244, 0.2)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(53, 116, 244, 0.3)',
                },
              }}
            >
              {isRecording ? t('stopRecording') : t('startRecording')}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Typography variant="h4" sx={{ mb: 4 }}>
        {t('recentConferences')}
      </Typography>

      {conferences.length === 0 ? (
        <Card
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'grey.300',
            backgroundColor: 'background.paper',
          }}
        >
          <EventIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {t('noConferences')}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {conferences.map((conference) => (
            <Grid item xs={12} key={conference.id}>
              <Card
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EventIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">
                        {new Date(conference.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('duration')}: {conference.duration}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => {
                        setSelectedConference(conference);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {conference.summary}
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrowIcon />}
                    sx={{ mt: 2 }}
                  >
                    {t('playRecording')}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{t('deleteConfirmation')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('areYouSureDelete')} {selectedConference?.date}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => handleDelete(selectedConference?.id || '')}
            color="error"
            variant="contained"
          >
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 9999,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
};

export default Conferences; 