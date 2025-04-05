from flask import Blueprint, request, jsonify
from services.conference_service import ConferenceService
import os

conference_bp = Blueprint('conference', __name__)
conference_service = ConferenceService()

@conference_bp.route('/start', methods=['POST'])
def start_conference():
    data = request.json
    parent_language = data.get('parent_language', 'en')
    
    try:
        conference_id = conference_service.start_conference(parent_language)
        return jsonify({
            'message': 'Conference started successfully',
            'conference_id': conference_id
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@conference_bp.route('/record', methods=['POST'])
def record_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    conference_id = request.form.get('conference_id')
    
    if not conference_id:
        return jsonify({'error': 'Conference ID is required'}), 400
    
    try:
        # Save the audio file
        file_path = os.path.join('recordings', f'{conference_id}_{audio_file.filename}')
        audio_file.save(file_path)
        
        # Process the audio
        conference_service.process_audio(conference_id, file_path)
        
        return jsonify({'message': 'Audio processed successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@conference_bp.route('/summary/<conference_id>', methods=['GET'])
def get_summary(conference_id):
    try:
        summary = conference_service.get_summary(conference_id)
        return jsonify({'summary': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500 