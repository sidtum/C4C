# SpeakLink

A comprehensive solution designed to bridge the language gap between schools and non-English speaking parents, enabling better understanding of student progress and parent-teacher communication.

Check out our demo: https://youtu.be/KTO2y-lEk9I

## 🌟 Features

### 1. Student Information Understanding
- **Document Upload & Analysis**: Parents can upload student transcripts and report cards
- **Multilingual Q&A**: Ask questions about student performance in your native language
- **RAG-based System**: Advanced retrieval-augmented generation for accurate information processing
- **Real-time Translation**: Seamless translation of educational documents and queries

### 2. Parent-Teacher Conference Support
- **Real-time Recording**: Capture parent-teacher conferences
- **Automatic Transcription**: Convert speech to text in real-time
- **Multilingual Summaries**: Get comprehensive meeting summaries in your preferred language
- **Progress Tracking**: Maintain a history of all conferences and feedback

## 🛠️ Technical Stack

### Backend
- **Framework**: FastAPI & Flask
- **AI/ML**: OpenAI API, LangChain
- **Database**: ChromaDB for document storage
- **Audio Processing**: SpeechRecognition, pydub
- **OCR**: pytesseract for document text extraction
- **Translation**: deep-translator

### Frontend
- **Framework**: React with TypeScript
- **UI Components**: Modern, responsive design
- **State Management**: Efficient data handling
- **Real-time Updates**: WebSocket integration for live features

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- OpenAI API key
- Virtual environment (recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sidtum/SpeakLink.git
cd SpeakLink
```

2. **Backend Setup**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

3. **Frontend Setup**
```bash
cd frontend
npm install
```

4. **Environment Configuration**
- Create a `.env` file in the backend directory with:
```
OPENAI_API_KEY=your_api_key
```

### Running the Application

1. **Start the Backend**
```bash
cd backend
python server.py
```

2. **Start the Frontend**
```bash
cd frontend
npm start
```

## 📁 Project Structure

```
.
├── backend/
│   ├── services/        # Core business logic
│   ├── routes/          # API endpoints
│   ├── recordings/      # Conference recordings
│   ├── uploads/         # Document uploads
│   ├── chroma_db/       # Vector database
│   └── server.py        # Main application file
├── frontend/
│   ├── src/            # React components
│   ├── public/         # Static assets
│   └── package.json    # Frontend dependencies
└── requirements.txt    # Python dependencies
```
