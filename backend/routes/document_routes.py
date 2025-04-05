from flask import Blueprint, request, jsonify
from services.document_service import DocumentService
from services.rag_service import RAGService
import os

document_bp = Blueprint('document', __name__)
document_service = DocumentService()
rag_service = RAGService()

@document_bp.route('/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Save the file
        file_path = os.path.join('uploads', file.filename)
        file.save(file_path)
        
        # Process the document
        document_id = document_service.process_document(file_path)
        
        return jsonify({
            'message': 'Document uploaded successfully',
            'document_id': document_id
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@document_bp.route('/query', methods=['POST'])
def query_document():
    data = request.json
    document_id = data.get('document_id')
    question = data.get('question')
    language = data.get('language', 'en')
    
    if not document_id or not question:
        return jsonify({'error': 'Document ID and question are required'}), 400
    
    try:
        answer = rag_service.query_document(document_id, question, language)
        return jsonify({'answer': answer}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500 