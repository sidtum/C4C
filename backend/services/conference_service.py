import os
import json
import logging
import subprocess
from datetime import datetime
from typing import Dict, Optional, List
import speech_recognition as sr
import tempfile
import shutil
from deep_translator import GoogleTranslator
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConferenceService:
    def __init__(self):
        self.conferences: Dict[str, Dict] = {}
        self.recordings_dir = "recordings"
        self.conferences_file = "conferences.json"
        os.makedirs(self.recordings_dir, exist_ok=True)
        
        # Initialize speech recognition
        self.recognizer = sr.Recognizer()
        
        # Initialize vector store for conference transcripts
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = Chroma(
            persist_directory="chroma_db/conferences",
            embedding_function=self.embeddings
        )
        
        # Load conferences from file
        self._load_conferences()
        
        # Check if ffmpeg is available
        self.ffmpeg_available = self._check_ffmpeg()
        if not self.ffmpeg_available:
            logger.warning("ffmpeg is not available. Audio conversion may not work properly.")
            logger.warning("Please install ffmpeg: https://ffmpeg.org/download.html")
        
        # Language code mapping for speech recognition
        self.language_codes = {
            "en": "en-US",
            "es": "es-ES",
            "fr": "fr-FR",
            "de": "de-DE",
            "zh": "zh-CN",
            "ja": "ja-JP",
            "ko": "ko-KR",
            "ru": "ru-RU",
            "ar": "ar-SA",
            "hi": "hi-IN",
            "vi": "vi-VN",
            "th": "th-TH"
        }

    def _load_conferences(self):
        """Load conferences from the JSON file."""
        try:
            if os.path.exists(self.conferences_file):
                with open(self.conferences_file, 'r') as f:
                    data = json.load(f)
                    # Ensure all required fields are present
                    for conf_id, conf_data in data.items():
                        if "start_time" not in conf_data:
                            conf_data["start_time"] = datetime.now().isoformat()
                        if "transcripts" not in conf_data:
                            conf_data["transcripts"] = []
                        if "parent_language" not in conf_data:
                            conf_data["parent_language"] = "en"
                        if "summary" not in conf_data:
                            conf_data["summary"] = None
                    self.conferences = data
                    logger.info(f"Loaded {len(self.conferences)} conferences from file")
            else:
                # Create an empty conferences file if it doesn't exist
                with open(self.conferences_file, 'w') as f:
                    json.dump({}, f)
                logger.info("Created new conferences file")
        except Exception as e:
            logger.error(f"Error loading conferences: {str(e)}")
            self.conferences = {}

    def _save_conferences(self):
        """Save conferences to the JSON file."""
        try:
            # Ensure the directory exists
            os.makedirs(os.path.dirname(self.conferences_file), exist_ok=True)
            
            # Save the conferences data
            with open(self.conferences_file, 'w') as f:
                json.dump(self.conferences, f, indent=2)
            logger.info(f"Saved {len(self.conferences)} conferences to file")
        except Exception as e:
            logger.error(f"Error saving conferences: {str(e)}")

    def _check_ffmpeg(self) -> bool:
        """Check if ffmpeg is available on the system."""
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
            return True
        except (subprocess.SubprocessError, FileNotFoundError):
            return False

    def conference_exists(self, conference_id: str) -> bool:
        """Check if a conference exists."""
        return conference_id in self.conferences

    def start_conference(self, parent_language: str = "en") -> str:
        """Start a new conference and return its ID."""
        conference_id = str(datetime.now().timestamp())
        self.conferences[conference_id] = {
            "id": conference_id,
            "parent_language": parent_language,
            "start_time": datetime.now().isoformat(),
            "transcripts": [],
            "summary": None
        }
        self._save_conferences()  # Save after adding new conference
        logger.info(f"Started new conference {conference_id} with language {parent_language}")
        return conference_id

    def _convert_to_wav(self, audio_path: str) -> Optional[str]:
        """Convert audio file to WAV format using ffmpeg."""
        try:
            # Create a temporary file for the WAV output
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                wav_path = temp_file.name
            
            if self.ffmpeg_available:
                try:
                    # Convert to WAV with specific parameters for speech recognition
                    subprocess.run([
                        "ffmpeg", 
                        "-i", audio_path,
                        "-acodec", "pcm_s16le",  # 16-bit PCM
                        "-ar", "16000",          # 16kHz sample rate
                        "-ac", "1",              # Mono audio
                        "-y",                    # Overwrite output file
                        wav_path
                    ], check=True, capture_output=True)
                    
                    logger.info(f"Successfully converted {audio_path} to WAV format")
                    return wav_path
                except subprocess.SubprocessError as e:
                    logger.error(f"Error converting audio with ffmpeg: {str(e)}")
                    return None
            else:
                logger.error("ffmpeg is not available for audio conversion")
                return None
                
        except Exception as e:
            logger.error(f"Error in audio conversion: {str(e)}")
            return None

    def _store_transcript_in_vector_db(self, conference_id: str, transcript: str):
        """Store conference transcript in vector database."""
        try:
            # Split transcript into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            chunks = text_splitter.split_text(transcript)
            
            # Add metadata to each chunk
            metadatas = [{
                "conference_id": conference_id,
                "chunk_index": i,
                "timestamp": datetime.now().isoformat()
            } for i in range(len(chunks))]
            
            # Add to vector store
            self.vector_store.add_texts(
                texts=chunks,
                metadatas=metadatas
            )
            
            # Save the vector store
            self.vector_store.persist()
            
            logger.info(f"Stored transcript for conference {conference_id} in vector database")
        except Exception as e:
            logger.error(f"Error storing transcript in vector database: {str(e)}")

    def query_conference(self, conference_id: str, question: str, language: str = "en") -> str:
        """Query a conference transcript using RAG."""
        try:
            # First check if conference exists and has transcripts
            if conference_id not in self.conferences:
                return "Conference not found."
            
            conference = self.conferences[conference_id]
            if not conference["transcripts"]:
                return "No transcripts available for this conference."
            
            # Search vector store with metadata filter
            docs = self.vector_store.similarity_search(
                question,
                k=3,
                filter={"conference_id": conference_id}
            )
            
            if not docs:
                return "I cannot find that information in the conference transcript."
            
            # Combine relevant chunks
            context = "\n".join([doc.page_content for doc in docs])
            
            # Translate question if needed
            if language != "en":
                question = GoogleTranslator(source='auto', target='en').translate(question)
            
            # Generate answer using RAG
            prompt = f"""You are an AI assistant helping parents understand their child's progress in school. 
            Based on the following conference transcript context, answer the question in a clear and helpful way.
            If the answer cannot be found in the context, say "I cannot find that information in the conference transcript."

            Conference Transcript Context:
            {context}

            Question: {question}

            Please provide a clear and concise answer based on the transcript. If the information is not in the transcript, 
            say so rather than making up information.
            """
            
            # Use OpenAI to generate the answer
            from openai import OpenAI
            client = OpenAI()
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that helps parents understand their child's progress in school."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            answer = response.choices[0].message.content
            
            # Translate answer if needed
            if language != "en":
                answer = GoogleTranslator(source='en', target=language).translate(answer)
            
            return answer
        except Exception as e:
            logger.error(f"Error querying conference: {str(e)}")
            return "Sorry, I encountered an error while processing your question."

    def process_audio(self, conference_id: str, audio_path: str) -> str:
        """Process audio recording and store transcript."""
        try:
            # Convert to WAV if needed
            wav_path = self._convert_to_wav(audio_path)
            if not wav_path:
                raise Exception("Failed to convert audio to WAV format")
            
            # Get conference language
            conference = self.conferences[conference_id]
            language_code = self.language_codes.get(
                conference["parent_language"],
                "en-US"
            )
            
            # Transcribe audio
            with sr.AudioFile(wav_path) as source:
                audio = self.recognizer.record(source)
                transcript = self.recognizer.recognize_google(audio, language=language_code)
            
            # Store transcript in conference data
            if conference_id in self.conferences:
                transcript_data = {
                    "text": transcript,
                    "timestamp": datetime.now().isoformat()
                }
                self.conferences[conference_id]["transcripts"].append(transcript_data)
                
                # Store in vector database
                self._store_transcript_in_vector_db(conference_id, transcript)
                
                # Save conference data
                self._save_conferences()
            
            # Clean up temporary file
            os.unlink(wav_path)
            
            return transcript
        except Exception as e:
            logger.error(f"Error processing audio: {str(e)}")
            raise

    def get_summary(self, conference_id: str, language: str = "en") -> str:
        """Generate a summary of the conference."""
        try:
            if not self.conference_exists(conference_id):
                raise ValueError(f"Conference {conference_id} not found")
            
            conference = self.conferences[conference_id]
            
            # If summary already exists, return it
            if conference["summary"]:
                return conference["summary"]
            
            # Combine all transcripts
            full_text = " ".join(t["text"] for t in conference["transcripts"])
            
            # Create a basic summary
            summary = f"Conference Summary:\n"
            summary += f"Duration: {len(conference['transcripts'])} segments\n"
            summary += f"Key Points:\n"
            
            # Extract key sentences (simple implementation)
            sentences = full_text.split(". ")
            key_points = sentences[:5]  # Take first 5 sentences as key points
            
            for point in key_points:
                summary += f"- {point.strip()}\n"
            
            # Store summary
            conference["summary"] = summary
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            raise

    def delete_conference(self, conference_id: str) -> None:
        """Delete a conference and its associated files."""
        try:
            if conference_id in self.conferences:
                # Delete conference from memory
                del self.conferences[conference_id]
                
                # Delete associated recording files
                recording_pattern = os.path.join(self.recordings_dir, f"{conference_id}_*")
                for file in os.listdir(self.recordings_dir):
                    if file.startswith(f"{conference_id}_"):
                        file_path = os.path.join(self.recordings_dir, file)
                        try:
                            os.remove(file_path)
                            logger.info(f"Deleted recording file: {file_path}")
                        except Exception as e:
                            logger.warning(f"Failed to delete recording file {file_path}: {str(e)}")
                
                # Delete from vector store
                try:
                    # Get all documents with this conference_id
                    docs = self.vector_store.get(
                        where={"conference_id": conference_id}
                    )
                    # Delete each document
                    for doc in docs:
                        self.vector_store.delete(doc['ids'])
                except Exception as e:
                    logger.warning(f"Failed to delete conference from vector store: {str(e)}")
                
                # Save changes to file
                self._save_conferences()
                logger.info(f"Successfully deleted conference {conference_id}")
            else:
                raise ValueError(f"Conference {conference_id} not found")
        except Exception as e:
            logger.error(f"Error deleting conference: {str(e)}")
            raise

    def get_all_conferences(self) -> List[Dict]:
        """Get all conferences with their metadata."""
        try:
            conferences = []
            for conference_id, conference_data in self.conferences.items():
                # Calculate duration if we have transcripts
                duration = "Unknown"
                if conference_data["transcripts"]:
                    try:
                        # Get the first and last transcript timestamps
                        first_time = datetime.fromisoformat(conference_data["transcripts"][0]["timestamp"])
                        last_time = datetime.fromisoformat(conference_data["transcripts"][-1]["timestamp"])
                        duration_seconds = (last_time - first_time).total_seconds()
                        
                        # Format duration as HH:MM:SS
                        hours = int(duration_seconds // 3600)
                        minutes = int((duration_seconds % 3600) // 60)
                        seconds = int(duration_seconds % 60)
                        duration = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                    except Exception as e:
                        logger.warning(f"Error calculating duration: {str(e)}")
                        duration = "Unknown"
                
                conferences.append({
                    "id": conference_id,
                    "start_time": conference_data["start_time"],
                    "parent_language": conference_data["parent_language"],
                    "transcript_count": len(conference_data["transcripts"]),
                    "duration": duration
                })
            return conferences
        except Exception as e:
            logger.error(f"Error getting all conferences: {str(e)}")
            raise

    def translate_conference(self, conference_id: str, target_language: str) -> str:
        """Translate the conference transcript to the target language."""
        try:
            if not self.conference_exists(conference_id):
                raise ValueError(f"Conference {conference_id} not found")
            
            conference = self.conferences[conference_id]
            
            # Combine all transcripts
            full_text = " ".join(t["text"] for t in conference["transcripts"])
            
            # Use Google Translate via deep-translator
            try:
                # Create a translator instance
                translator = GoogleTranslator(source='auto', target=target_language)
                
                # Translate the text
                translated_text = translator.translate(full_text)
                logger.info(f"Successfully translated text to {target_language}")
                return translated_text
            except Exception as e:
                logger.error(f"Translation service error: {str(e)}")
                return f"Error with translation service: {str(e)}"
                
        except Exception as e:
            logger.error(f"Error translating conference: {str(e)}")
            raise