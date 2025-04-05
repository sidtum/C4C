import React, { useState } from 'react';
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
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';

const Documents: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setDocuments([...documents, { id: data.document_id, name: file.name }]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    setLoading(true);
    try {
      // Implement delete functionality
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 6 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          {t('documents')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('uploadDescription')}
        </Typography>
      </Box>

      <Box sx={{ mb: 6 }}>
        <input
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<CloudUploadIcon />}
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
            {t('upload')}
          </Button>
        </label>
      </Box>

      <Typography variant="h4" sx={{ mb: 4 }}>
        {t('recentDocuments')}
      </Typography>

      {documents.length === 0 ? (
        <Card
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'grey.300',
            backgroundColor: 'background.paper',
          }}
        >
          <DescriptionIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {t('noDocuments')}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {documents.map((doc) => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {doc.name}
                    </Typography>
                    <IconButton
                      onClick={() => {
                        setSelectedDocument(doc);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ color: 'error.main' }}
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
        <DialogTitle>{t('deleteConfirmation')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('areYouSureDelete')} "{selectedDocument?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => handleDelete(selectedDocument?.id)}
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

export default Documents; 