import os
import uuid
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import speech_recognition as sr
import tempfile

# Load environment variables
load_dotenv()

class ConferenceService:
    def __init__(self):
        self.llm = ChatOpenAI(
            temperature=0,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        self.recognizer = sr.Recognizer()
        self.conferences = {}
        
        self.summary_prompt = PromptTemplate(
            template="""Please provide a comprehensive summary of the following parent-teacher conference in {language}.
            Focus on the key points discussed, action items, and any important decisions made.
            
            Conference transcript:
            {transcript}
            
            Summary in {language}:""",
            input_variables=["transcript", "language"]
        )
    
    def start_conference(self, language: str = "en") -> str:
        conference_id = str(uuid.uuid4())
        self.conferences[conference_id] = {
            "language": language,
            "transcript": ""
        }
        return conference_id
    
    def process_audio(self, conference_id: str, audio_path: str) -> str:
        if conference_id not in self.conferences:
            raise ValueError("Conference not found")
        
        try:
            # Convert audio to text using speech recognition
            with sr.AudioFile(audio_path) as source:
                audio = self.recognizer.record(source)
                text = self.recognizer.recognize_google(audio)
            
            # Update conference transcript
            self.conferences[conference_id]["transcript"] += text + "\n"
            
            return text
        except Exception as e:
            raise Exception(f"Error processing audio: {str(e)}")
        finally:
            # Clean up the temporary audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)
    
    def get_summary(self, conference_id: str, language: str = "en") -> str:
        if conference_id not in self.conferences:
            raise ValueError("Conference not found")
        
        transcript = self.conferences[conference_id]["transcript"]
        if not transcript:
            return "No transcript available for this conference."
        
        # Generate summary using LLM
        chain = self.summary_prompt | self.llm
        result = chain.invoke({
            "transcript": transcript,
            "language": language
        })
        
        return result.content 