import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import theme from './theme';
import './i18n';
import Home from './pages/Home';
import Documents from './pages/Documents';
import Conferences from './pages/Conferences';
import Chat from './pages/Chat';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/conferences" element={<Conferences />} />
              <Route path="/chat" element={<Chat />} />
            </Routes>
          </Layout>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;
