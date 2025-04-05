from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from services.document_service import DocumentService
from services.rag_service import RAGService
from services.conference_service import ConferenceService
import shutil
from typing import List

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
document_service = DocumentService()
rag_service = RAGService()
conference_service = ConferenceService()

# Create upload directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        # Save the uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the document
        try:
            document_id = document_service.process_document(file_path)
            return {"document_id": document_id}
        except Exception as e:
            print(f"Error processing document: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
    finally:
        file.file.close()

@app.post("/query")
async def query_document(document_id: str, question: str, language: str = "en"):
    try:
        answer = rag_service.query_document(document_id, question, language)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summary/{document_id}")
async def get_summary(document_id: str, language: str = "en"):
    try:
        summary = rag_service.get_document_summary(document_id, language)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conference/start")
async def start_conference(language: str = "en"):
    try:
        conference_id = conference_service.start_conference(language)
        return {"conference_id": conference_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/conference/{conference_id}/audio")
async def process_audio(conference_id: str, audio: UploadFile = File(...)):
    try:
        # Save the audio file
        audio_path = os.path.join(UPLOAD_DIR, f"{conference_id}_{audio.filename}")
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        # Process the audio
        transcript = conference_service.process_audio(conference_id, audio_path)
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        audio.file.close()

@app.get("/conference/{conference_id}/summary")
async def get_conference_summary(conference_id: str, language: str = "en"):
    try:
        summary = conference_service.get_summary(conference_id, language)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 