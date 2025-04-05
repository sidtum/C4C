from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Cookie, Response
from fastapi.middleware.cors import CORSMiddleware
import os
from services.document_service import DocumentService
from services.rag_service import RAGService
from services.conference_service import ConferenceService
import shutil
from typing import List, Optional
import json
from datetime import datetime
from pydantic import BaseModel
import uuid

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

# Create a directory for session data
SESSION_DIR = "sessions"
os.makedirs(SESSION_DIR, exist_ok=True)

class QueryRequest(BaseModel):
    document_id: str
    question: str
    language: str = "en"

class DeleteRequest(BaseModel):
    document_id: str

def get_session_file(session_id: str) -> str:
    return os.path.join(SESSION_DIR, f"{session_id}.json")

@app.get("/documents")
async def get_documents(session_id: Optional[str] = Cookie(None)):
    try:
        if not session_id:
            # Create a new session
            session_id = str(uuid.uuid4())
            documents = []
        else:
            # Load existing session
            session_file = get_session_file(session_id)
            if os.path.exists(session_file):
                with open(session_file, "r") as f:
                    documents = json.load(f)
            else:
                documents = []
        
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: Optional[str] = Cookie(None),
    response: Response = None
):
    try:
        if not session_id:
            session_id = str(uuid.uuid4())
            response.set_cookie(key="session_id", value=session_id)
        
        # Save the uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the document
        try:
            document_id = document_service.process_document(file_path)
            
            # Update session documents
            session_file = get_session_file(session_id)
            if os.path.exists(session_file):
                with open(session_file, "r") as f:
                    documents = json.load(f)
            else:
                documents = []
            
            documents.append({
                "id": document_id,
                "name": file.filename,
                "upload_date": str(datetime.now())
            })
            
            with open(session_file, "w") as f:
                json.dump(documents, f)
            
            return {"document_id": document_id}
        except Exception as e:
            print(f"Error processing document: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
    finally:
        file.file.close()

@app.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    session_id: Optional[str] = Cookie(None)
):
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="No session found")
        
        session_file = get_session_file(session_id)
        if not os.path.exists(session_file):
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Load and update session documents
        with open(session_file, "r") as f:
            documents = json.load(f)
        
        # Find and remove the document
        updated_documents = [doc for doc in documents if doc["id"] != document_id]
        
        # Save updated documents
        with open(session_file, "w") as f:
            json.dump(updated_documents, f)
        
        # Delete the document from the vector store
        document_service.delete_document(document_id)
        
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_document(request: QueryRequest):
    try:
        answer = rag_service.query_document(request.document_id, request.question, request.language)
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