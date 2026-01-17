from flask import Flask, jsonify, send_from_directory
import os

app = Flask(__name__, static_folder='static', static_url_path='/static')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, 'docs')
STATIC_DIR = os.path.join(BASE_DIR, 'static')


@app.route('/')
def index():
    return send_from_directory(STATIC_DIR, 'index.html')


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)


@app.route('/api/docs')
def list_docs():
    """List all markdown files in the docs directory."""
    try:
        files = [f for f in os.listdir(DOCS_DIR) if f.endswith('.md')]
        return jsonify({'docs': sorted(files)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/docs/<filename>')
def get_doc(filename):
    """Get the content of a specific markdown file."""
    if not filename.endswith('.md'):
        return jsonify({'error': 'Invalid file type'}), 400
    
    filepath = os.path.join(DOCS_DIR, filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    
    # Security check: ensure the file is within DOCS_DIR
    if not os.path.abspath(filepath).startswith(os.path.abspath(DOCS_DIR)):
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({'filename': filename, 'content': content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
