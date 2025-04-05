from flask import Blueprint, request, jsonify
from services.conference_service import ConferenceService
import os

conference_bp = Blueprint('conference', __name__)
conference_service = ConferenceService()

# Create recordings directory if it doesn't exist
RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'recordings')
os.makedirs(RECORDINGS_DIR, exist_ok=True)

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
    if not audio_file.filename:
        return jsonify({'error': 'No selected file'}), 400
        
    conference_id = request.form.get('conference_id')
    
    if not conference_id:
        return jsonify({'error': 'Conference ID is required'}), 400
    
    try:
        # Ensure the filename is safe
        filename = os.path.basename(audio_file.filename)
        # Save the audio file with absolute path
        file_path = os.path.join(RECORDINGS_DIR, f'{conference_id}_{filename}')
        
        # Create recordings directory if it doesn't exist (redundant but safe)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Save the file
        audio_file.save(file_path)
        
        try:
            # Process the audio
            result = conference_service.process_audio(conference_id, file_path)
            return jsonify({
                'message': 'Audio processed successfully',
                'text': result
            }), 200
        except Exception as e:
            # If processing fails, still return a specific error
            return jsonify({
                'error': f'Error processing audio: {str(e)}',
                'details': 'Audio file was saved but could not be processed'
            }), 500
        finally:
            # Clean up the audio file
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception:
                    pass  # Ignore cleanup errors
                    
    except Exception as e:
        return jsonify({'error': f'Error saving audio file: {str(e)}'}), 500

@conference_bp.route('/summary/<conference_id>', methods=['GET'])
def get_summary(conference_id):
    try:
        summary = conference_service.get_summary(conference_id)
        return jsonify({'summary': summary}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500 