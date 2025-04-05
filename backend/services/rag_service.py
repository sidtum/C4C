from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

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
        3. Provide the answer in the specified language ({language})
        
        If you don't know the answer based on the context, just say that you don't know, don't try to make up an answer.
        
        Context: {context}
        
        Question: {question}
        
        Answer in {language}:
        """
        
        self.prompt = PromptTemplate(
            template=self.prompt_template,
            input_variables=["context", "question", "language"]
        )
    
    def query_document(self, document_id, question, language):
        # Create retriever with appropriate search parameters
        retriever = self.vector_store.as_retriever(
            search_kwargs={
                "filter": {"document_id": document_id},
                "k": 5  # Number of relevant chunks to retrieve
            }
        )
        
        # Create a custom chain that includes the language parameter
        def custom_chain(inputs):
            # Get relevant documents
            docs = retriever.get_relevant_documents(inputs["query"])
            context = "\n".join([doc.page_content for doc in docs])
            
            # Format the prompt with all required variables
            formatted_prompt = self.prompt.format(
                context=context,
                question=inputs["query"],
                language=language
            )
            
            # Get the answer from the LLM
            response = self.llm.invoke(formatted_prompt)
            return {"result": response.content}
        
        # Get answer with error handling
        try:
            result = custom_chain({
                "query": question
            })
            return result["result"]
        except Exception as e:
            return f"Error processing your question: {str(e)}"
    
    def get_document_summary(self, document_id, language):
        # Retrieve all chunks for the document
        retriever = self.vector_store.as_retriever(
            search_kwargs={"filter": {"document_id": document_id}}
        )
        
        # Create summary prompt
        summary_prompt = PromptTemplate(
            template="""Please provide a comprehensive summary of the following academic document in {language}.
            Focus on the student's performance, grades, and any notable achievements or areas for improvement.
            
            Document content:
            {document}
            
            Summary in {language}:""",
            input_variables=["document", "language"]
        )
        
        # Get document content
        docs = retriever.get_relevant_documents("")
        document_content = "\n".join([doc.page_content for doc in docs])
        
        # Generate summary
        chain = summary_prompt | self.llm
        result = chain.invoke({
            "document": document_content,
            "language": language
        })
        
        return result.content 