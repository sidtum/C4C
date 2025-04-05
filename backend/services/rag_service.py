from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class RAGService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(openai_api_key=os.getenv('OPENAI_API_KEY'))
        self.vector_store = Chroma(
            persist_directory="chroma_db",
            embedding_function=self.embeddings,
            collection_name="documents"
        )
        self.llm = ChatOpenAI(
            temperature=0,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        self.prompt_template = """You are a helpful assistant that helps parents understand their child's academic progress.
        You will be given a question and some context from the student's academic documents.
        Your task is to:
        1. Analyze the context to find relevant information
        2. Answer the question based on the context
        3. Provide a clear and detailed answer
        
        If you don't know the answer based on the context, just say that you don't know, don't try to make up an answer.
        
        Context: {context}
        
        Question: {question}
        
        Answer:
        """
        
        self.prompt = PromptTemplate(
            template=self.prompt_template,
            input_variables=["context", "question"]
        )
        
        self.translation_prompt = PromptTemplate(
            template="""Translate the following text from {source_lang} to {target_lang}. 
            Only provide the translation, no additional text or explanations.
            Maintain the same format and structure as the original text.
            
            Text to translate:
            {text}
            
            Translation:""",
            input_variables=["text", "source_lang", "target_lang"]
        )
        
        self.language_detection_prompt = PromptTemplate(
            template="""Detect the language of the following text. 
            Return only the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish).
            
            Text: {text}
            
            Language code:""",
            input_variables=["text"]
        )
    
    def detect_language(self, text: str) -> str:
        """Detect the language of the input text"""
        chain = self.language_detection_prompt | self.llm
        result = chain.invoke({"text": text})
        return result.content.strip().lower()
    
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text from source language to target language"""
        if source_lang == target_lang:
            return text
            
        chain = self.translation_prompt | self.llm
        result = chain.invoke({
            "text": text,
            "source_lang": source_lang,
            "target_lang": target_lang
        })
        return result.content.strip()
    
    def query_document(self, document_id: str, question: str, language: str) -> str:
        try:
            # Detect the language of the question
            detected_lang = self.detect_language(question)
            logger.info(f"Detected language: {detected_lang}, Target language: {language}")
            
            # If the question is not in English, translate it first
            if detected_lang != "en":
                question = self.translate_text(question, detected_lang, "en")
                logger.info(f"Translated question to English: {question}")
            
            # Create retriever with appropriate search parameters
            retriever = self.vector_store.as_retriever(
                search_kwargs={
                    "filter": {"document_id": document_id},
                    "k": 5  # Number of relevant chunks to retrieve
                }
            )
            
            # Create a custom chain that processes the query in English
            def custom_chain(inputs):
                # Get relevant documents
                docs = retriever.get_relevant_documents(inputs["query"])
                context = "\n".join([doc.page_content for doc in docs])
                
                # Format the prompt with all required variables
                formatted_prompt = self.prompt.format(
                    context=context,
                    question=inputs["query"]
                )
                
                # Get the answer from the LLM
                response = self.llm.invoke(formatted_prompt)
                return {"result": response.content}
            
            # Get answer with error handling
            result = custom_chain({
                "query": question
            })
            
            # If the target language is not English, translate the answer
            if language != "en":
                result["result"] = self.translate_text(result["result"], "en", language)
                logger.info(f"Translated answer to {language}")
            
            return result["result"]
        except Exception as e:
            logger.error(f"Error in query_document: {str(e)}")
            error_message = f"Error processing your question: {str(e)}"
            if language != "en":
                error_message = self.translate_text(error_message, "en", language)
            return error_message
    
    def get_document_summary(self, document_id: str, language: str) -> str:
        try:
            # Retrieve all chunks for the document
            retriever = self.vector_store.as_retriever(
                search_kwargs={"filter": {"document_id": document_id}}
            )
            
            # Create summary prompt
            summary_prompt = PromptTemplate(
                template="""Please provide a comprehensive summary of the following academic document.
                Focus on the student's performance, grades, and any notable achievements or areas for improvement.
                
                Document content:
                {document}
                
                Summary:""",
                input_variables=["document"]
            )
            
            # Get document content
            docs = retriever.get_relevant_documents("")
            document_content = "\n".join([doc.page_content for doc in docs])
            
            # Generate summary in English
            chain = summary_prompt | self.llm
            result = chain.invoke({
                "document": document_content
            })
            
            # If the target language is not English, translate the summary
            if language != "en":
                result.content = self.translate_text(result.content, "en", language)
            
            return result.content
        except Exception as e:
            logger.error(f"Error in get_document_summary: {str(e)}")
            error_message = f"Error generating summary: {str(e)}"
            if language != "en":
                error_message = self.translate_text(error_message, "en", language)
            return error_message 