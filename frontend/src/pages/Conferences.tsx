import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Snackbar,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import TranslateIcon from '@mui/icons-material/Translate';

interface Conference {
  id: string;
  date: string;
  duration: string;
  summary: string;
  language: string;
  transcript?: string;
  translatedTranscript?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [translating, setTranslating] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Use refs to maintain values across async operations
  const currentConferenceIdRef = useRef<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      // Reset any previous errors
      setError(null);
      
      // First, check microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If we get here, we have permission, so start the conference
      const startResponse = await fetch('http://localhost:8000/conference/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parent_language: selectedLanguage }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.detail || 'Failed to start conference');
      }
      
      const startData = await startResponse.json();
      console.log("Started conference with ID:", startData.conference_id);
      currentConferenceIdRef.current = startData.conference_id;

      // Create the MediaRecorder with the already obtained stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';
      
      console.log('Using MIME type for recording:', mimeType);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      // Clear previous chunks
      audioChunksRef.current = [];
      setAudioChunks([]);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current = [...audioChunksRef.current, e.data];
          setAudioChunks(prev => [...prev, e.data]);
        }
      };

      recorder.onstop = async () => {
        try {
          const conferenceId = currentConferenceIdRef.current;
          if (!conferenceId) {
            throw new Error("No conference ID available");
          }
          
          // Create a blob from the recorded chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Create a FormData object
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${mimeType.split('/')[1]}`);
          formData.append('conference_id', conferenceId);

          setLoading(true);
          
          console.log("Sending audio to backend with conference ID:", conferenceId);
          
          // Send the audio to the backend
          const response = await fetch('http://localhost:8000/conference/record', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to process audio');
          }
          
          const data = await response.json();
          console.log("Received response from backend:", data);
          
          // Calculate duration
          const duration = recordingStartTime 
            ? Math.round((new Date().getTime() - recordingStartTime.getTime()) / 1000 / 60) + ' minutes'
            : 'Unknown duration';
          
          // Add the new conference to the list
          const newConference = {
            id: conferenceId,
            date: new Date().toISOString(),
            duration: duration,
            summary: data.text || 'No summary available',
            language: selectedLanguage,
            transcript: data.text
          };
          
          setConferences([newConference, ...conferences]);
        } catch (error) {
          console.error('Error processing audio:', error);
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
        }
        setLoading(false);
        currentConferenceIdRef.current = null;
        setRecordingStartTime(null);
      };

      // Start recording with 1-second intervals
      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingStartTime(new Date());
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Microphone access was denied. Please allow microphone access in your browser settings and try again.');
        } else if (error.name === 'NotFoundError') {
          setError('No microphone found. Please ensure you have a working microphone connected.');
        } else {
          setError(`Failed to access microphone: ${error.message}`);
        }
      } else {
        setError('Failed to access microphone. Please check your permissions.');
      }
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete conference');
      }
      
      setConferences(conferences.filter(conf => conf.id !== conferenceId));
      setError(null);
    } catch (error) {
      console.error('Error deleting conference:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete conference');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const playRecording = async (conferenceId: string) => {
    try {
      // If already playing this recording, stop it
      if (currentlyPlaying === conferenceId && audioRef.current) {
        audioRef.current.pause();
        setCurrentlyPlaying(null);
        return;
      }
      
      // If playing a different recording, stop it first
      if (currentlyPlaying && audioRef.current) {
        audioRef.current.pause();
      }
      
      // Create a new audio element
      const audio = new Audio(`http://localhost:8000/recordings/${conferenceId}_recording.webm`);
      audioRef.current = audio;
      
      // Set up event listeners
      audio.onended = () => {
        setCurrentlyPlaying(null);
      };
      
      audio.onerror = (e) => {
        console.error('Error playing audio:', e);
        setError('Failed to play recording. The audio file may not be available.');
        setCurrentlyPlaying(null);
      };
      
      // Play the audio
      await audio.play();
      setCurrentlyPlaying(conferenceId);
    } catch (error) {
      console.error('Error playing recording:', error);
      setError('Failed to play recording. The audio file may not be available.');
    }
  };

  const handleTranslate = async (conferenceId: string) => {
    try {
      setTranslating(conferenceId);
      const response = await fetch(`http://localhost:8000/conference/${conferenceId}/translate?target_language=${selectedLanguage}`);
      
      if (!response.ok) {
        throw new Error('Failed to translate conference');
      }
      
      const data = await response.json();
      
      setConferences(prevConferences => 
        prevConferences.map(conf => 
          conf.id === conferenceId 
            ? { ...conf, translatedTranscript: data.translated_text }
            : conf
        )
      );
    } catch (error) {
      console.error('Error translating conference:', error);
      setError(error instanceof Error ? error.message : 'Failed to translate conference');
    } finally {
      setTranslating(null);
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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

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
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {conference.summary}
                  </Typography>
                  
                  {conference.transcript && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('transcript')}:
                      </Typography>
                      <Typography variant="body1">
                        {conference.transcript}
                      </Typography>
                    </Box>
                  )}

                  {conference.translatedTranscript && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {t('translatedTranscript')} ({selectedLanguage}):
                      </Typography>
                      <Typography variant="body1">
                        {conference.translatedTranscript}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={currentlyPlaying === conference.id ? <StopIcon /> : <PlayArrowIcon />}
                      onClick={() => playRecording(conference.id)}
                      disabled={!conference.transcript}
                    >
                      {currentlyPlaying === conference.id ? t('stop') : t('playRecording')}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<TranslateIcon />}
                      onClick={() => handleTranslate(conference.id)}
                      disabled={translating === conference.id || !conference.transcript}
                    >
                      {translating === conference.id ? t('translating') : t('translate')}
                    </Button>
                    
                    <IconButton
                      color="error"
                      onClick={() => {
                        setSelectedConference(conference);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
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
        <DialogTitle>{t('deleteConference')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('deleteConferenceConfirmation')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={() => selectedConference && handleDelete(selectedConference.id)}
            color="error"
          >
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Conferences; 