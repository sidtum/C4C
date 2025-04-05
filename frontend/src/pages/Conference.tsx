import React, { useState, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import axios from 'axios';

const Conference: React.FC = () => {
  const [language, setLanguage] = useState('en');
  const [isRecording, setIsRecording] = useState(false);
  const [conferenceId, setConferenceId] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start a new conference
      const response = await axios.post('http://localhost:5000/api/conferences/start', {
        parent_language: language,
      });
      setConferenceId(response.data.conference_id);
    } catch (err) {
      setError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Get the audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('conference_id', conferenceId);

      setLoading(true);
      try {
        // Send the recording to the server
        await axios.post('http://localhost:5000/api/conferences/record', formData);

        // Get the summary
        const summaryResponse = await axios.get(
          `http://localhost:5000/api/conferences/summary/${conferenceId}`
        );
        setSummary(summaryResponse.data.summary);
      } catch (err) {
        setError('Failed to process recording. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4, mb: 4 }}>
        Parent-Teacher Conference
      </Typography>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Language</InputLabel>
          <Select
            value={language}
            label="Language"
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isRecording}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="es">Spanish</MenuItem>
            <MenuItem value="fr">French</MenuItem>
            <MenuItem value="zh">Chinese</MenuItem>
            <MenuItem value="ar">Arabic</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          {!isRecording ? (
            <Button
              variant="contained"
              startIcon={<MicIcon />}
              onClick={startRecording}
              disabled={loading}
            >
              Start Recording
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<StopIcon />}
              onClick={stopRecording}
            >
              Stop Recording
            </Button>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {summary && (
          <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom>
              Conference Summary
            </Typography>
            <Typography variant="body1">{summary}</Typography>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default Conference; 