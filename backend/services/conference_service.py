import os
import json
import logging
import subprocess
from datetime import datetime
from typing import Dict, Optional, List
import speech_recognition as sr
import tempfile
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConferenceService:
    def __init__(self):
        self.conferences: Dict[str, Dict] = {}
        self.recordings_dir = "recordings"
        os.makedirs(self.recordings_dir, exist_ok=True)
        
        # Initialize speech recognition
        self.recognizer = sr.Recognizer()
        
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

    def process_audio(self, conference_id: str, audio_path: str) -> str:
        """Process audio file and return transcript."""
        wav_path = None
        try:
            if not self.conference_exists(conference_id):
                raise ValueError(f"Conference {conference_id} not found")

            # Get conference language
            conference = self.conferences[conference_id]
            language_code = self.language_codes.get(
                conference["parent_language"],
                "en-US"
            )
            
            logger.info(f"Processing audio file: {audio_path}")
            
            # Convert audio to WAV using ffmpeg
            wav_path = self._convert_to_wav(audio_path)
            if not wav_path or not os.path.exists(wav_path):
                raise ValueError("Failed to convert audio file to WAV format")
            
            # Use speech recognition with the converted WAV file
            try:
                with sr.AudioFile(wav_path) as source:
                    # Adjust for ambient noise
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    
                    # Record the audio
                    audio = self.recognizer.record(source)
                    
                    # Recognize speech using Google's speech recognition (free tier)
                    try:
                        text = self.recognizer.recognize_google(audio, language=language_code)
                        logger.info(f"Successfully recognized speech: {text[:100]}...")
                    except sr.UnknownValueError:
                        text = "Could not understand audio"
                        logger.warning("Speech recognition could not understand audio")
                    except sr.RequestError as e:
                        text = f"Could not request results from speech recognition service: {str(e)}"
                        logger.error(f"Speech recognition request error: {str(e)}")
            except Exception as e:
                logger.error(f"Error processing audio with speech_recognition: {str(e)}")
                text = "Error processing audio. Please ensure ffmpeg is installed: https://ffmpeg.org/download.html"
            
            # Store transcript
            conference["transcripts"].append({
                "timestamp": datetime.now().isoformat(),
                "text": text
            })
            
            logger.info(f"Successfully processed audio for conference {conference_id}")
            return text
            
        except Exception as e:
            logger.error(f"Error processing audio: {str(e)}")
            raise
        finally:
            # Clean up temporary WAV file if it exists
            if wav_path and os.path.exists(wav_path):
                try:
                    os.remove(wav_path)
                except Exception as e:
                    logger.warning(f"Failed to remove temporary WAV file: {str(e)}")

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
            if not self.conference_exists(conference_id):
                raise ValueError(f"Conference {conference_id} not found")
            
            # Remove the conference from memory
            del self.conferences[conference_id]
            
            # Delete any associated recording files
            recording_pattern = os.path.join(self.recordings_dir, f"{conference_id}_*")
            for file in os.listdir(self.recordings_dir):
                if file.startswith(f"{conference_id}_"):
                    file_path = os.path.join(self.recordings_dir, file)
                    try:
                        os.remove(file_path)
                        logger.info(f"Deleted recording file: {file_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete recording file {file_path}: {str(e)}")
            
            logger.info(f"Successfully deleted conference {conference_id}")
        except Exception as e:
            logger.error(f"Error deleting conference: {str(e)}")
            raise

    def get_all_conferences(self) -> List[Dict]:
        """Get all conferences."""
        try:
            conferences = []
            for conference_id, conference_data in self.conferences.items():
                conferences.append({
                    "id": conference_id,
                    "date": conference_data.get("start_time", ""),
                    "duration": "Unknown",  # You might want to calculate this
                    "summary": conference_data.get("summary", "No summary available"),
                    "language": conference_data.get("parent_language", "en")
                })
            return conferences
        except Exception as e:
            logger.error(f"Error getting all conferences: {str(e)}")
            raise 