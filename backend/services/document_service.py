import os
import uuid
from PIL import Image
import pytesseract
import numpy as np
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
from PyPDF2 import PdfReader

# Load environment variables
load_dotenv()

class DocumentService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(openai_api_key=os.getenv('OPENAI_API_KEY'))
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        self.vector_store = Chroma(
            persist_directory="chroma_db",
            embedding_function=self.embeddings,
            collection_name="documents"
        )
        
    def process_document(self, file_path):
        try:
            # Generate unique document ID
            document_id = str(uuid.uuid4())
            
            # Extract text from document
            if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
                text = self._extract_text_from_image(file_path)
            elif file_path.lower().endswith('.pdf'):
                text = self._extract_text_from_pdf(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_path}")
            
            if not text.strip():
                raise ValueError("No text could be extracted from the document")
            
            # Split text into chunks
            chunks = self.text_splitter.split_text(text)
            
            # Store chunks in vector database
            self.vector_store.add_texts(
                texts=chunks,
                metadatas=[{"document_id": document_id} for _ in chunks]
            )
            
            return document_id
        except Exception as e:
            print(f"Error in process_document: {str(e)}")
            raise
    
    def delete_document(self, document_id):
        try:
            # Delete all chunks associated with the document from the vector store
            self.vector_store.delete(
                where={"document_id": document_id}
            )
            
            # Delete the uploaded file if it exists
            for filename in os.listdir("uploads"):
                if filename.startswith(document_id):
                    file_path = os.path.join("uploads", filename)
                    if os.path.exists(file_path):
                        os.remove(file_path)
            
            return True
        except Exception as e:
            print(f"Error in delete_document: {str(e)}")
            raise
    
    def _extract_text_from_image(self, image_path):
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        return text
    
    def _extract_text_from_pdf(self, pdf_path):
        text = ""
        with open(pdf_path, 'rb') as file:
            pdf_reader = PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text 