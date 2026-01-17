# ReadFaster

A speed reading tool using **Rapid Serial Visual Presentation (RSVP)** — displaying one word at a time for focused, distraction-free reading.

![Python](https://img.shields.io/badge/python-3.8+-blue) ![Flask](https://img.shields.io/badge/flask-3.0+-green)

## Features

- **RSVP Display** — Full-screen black backdrop with large, centered white text
- **Markdown-Aware** — Headings, blockquotes, and emphasis rendered with distinct styling
- **Speed Control** — Adjustable from 100-800 WPM via slider or keyboard
- **Scrub Bar** — Navigate through documents by dragging the progress bar
- **Document Selector** — Dropdown to choose from markdown files in `docs/`
- **Keyboard Controls** — Space to play/pause, arrows to navigate

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python3 app.py
```

Open **http://127.0.0.1:5000** in your browser.

## Usage

| Control | Action |
|---------|--------|
| `Space` | Play / Pause |
| `←` | Skip back 5 words |
| `→` | Skip forward 5 words |
| `↑` | Increase speed |
| `↓` | Decrease speed |
| `R` | Restart from beginning |

## Adding Documents

Drop any `.md` file into the `docs/` directory. It will appear in the document selector dropdown.

## Project Structure

```
readfaster/
├── app.py              # Flask server with API endpoints
├── requirements.txt    # Python dependencies
├── docs/               # Markdown documents to read
│   └── test.md
└── static/
    ├── index.html      # Main page
    ├── styles.css      # Dark theme styling
    └── app.js          # RSVP engine
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Serves the web app |
| `GET /api/docs` | Lists available markdown files |
| `GET /api/docs/<filename>` | Returns content of a specific file |

## License

MIT
