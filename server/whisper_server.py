#!/usr/bin/env python3
"""
LingoSync AI - Local Faster-Whisper Transcription Server
High-performance local voice-to-text generation with word-level timestamps.
Powered by faster-whisper (CTranslate2 + PyAV).
"""

import sys
import os
import json
import tempfile
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("Error: faster-whisper is not installed. Please install it using: pip install faster-whisper")
    sys.exit(1)

# Global model cache to avoid re-allocating memory on every request
LOADED_MODELS = {}
DEFAULT_MODEL_SIZE = "tiny"
DEFAULT_DEVICE = "cpu"
DEFAULT_COMPUTE_TYPE = "int8"


def get_model(model_size=DEFAULT_MODEL_SIZE, device=DEFAULT_DEVICE, compute_type=DEFAULT_COMPUTE_TYPE):
    key = f"{model_size}_{device}_{compute_type}"
    if key not in LOADED_MODELS:
        print(f"[Faster-Whisper] Loading model '{model_size}' on {device} ({compute_type})...")
        LOADED_MODELS[key] = WhisperModel(model_size, device=device, compute_type=compute_type)
        print(f"[Faster-Whisper] Model '{model_size}' ready.")
    return LOADED_MODELS[key]


class WhisperRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/health":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {
                "status": "ready",
                "service": "faster-whisper",
                "version": "1.2.1",
                "device": DEFAULT_DEVICE,
                "loaded_models": list(LOADED_MODELS.keys()),
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/transcribe":
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()
            return

        query_params = urllib.parse.parse_qs(parsed.query)
        model_size = query_params.get("model", [DEFAULT_MODEL_SIZE])[0]
        language = query_params.get("language", [None])[0]
        if language == "auto":
            language = None

        content_length = int(self.headers.get("Content-Length", 0))
        content_type = self.headers.get("Content-Type", "")

        if content_length == 0:
            self._send_error_json(400, "Empty request body.")
            return

        body = self.rfile.read(content_length)
        temp_file_path = None

        try:
            # Check if JSON request with existing filePath
            if "application/json" in content_type:
                data = json.loads(body.decode("utf-8"))
                file_path = data.get("filePath")
                if not file_path or not os.path.exists(file_path):
                    self._send_error_json(400, f"File path not found: {file_path}")
                    return
                audio_input = file_path
            else:
                # Direct binary audio/video data or multipart form
                # If multipart/form-data, extract binary payload
                if "multipart/form-data" in content_type:
                    # Find boundary and extract file bytes
                    boundary = content_type.split("boundary=")[-1].strip()
                    boundary_bytes = ("--" + boundary).encode()
                    parts = body.split(boundary_bytes)
                    file_bytes = None
                    for part in parts:
                        if b'filename="' in part:
                            header_end = part.find(b"\r\n\r\n")
                            if header_end != -1:
                                file_bytes = part[header_end + 4 :].rstrip(b"\r\n--")
                                break
                    if not file_bytes:
                        file_bytes = body
                else:
                    file_bytes = body

                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                    tmp.write(file_bytes)
                    temp_file_path = tmp.name
                audio_input = temp_file_path

            # Transcribe with faster-whisper
            model = get_model(model_size=model_size)
            print(f"[Faster-Whisper] Starting transcription (model={model_size}, lang={language or 'auto'})...")

            segments_generator, info = model.transcribe(
                audio_input,
                beam_size=5,
                word_timestamps=True,
                vad_filter=True,
                language=language,
            )

            segments_list = []
            words_list = []

            for seg in segments_generator:
                seg_words = []
                if seg.words:
                    for w in seg.words:
                        w_dict = {
                            "word": w.word.strip(),
                            "start": round(w.start, 2),
                            "end": round(w.end, 2),
                            "probability": round(w.probability, 3) if hasattr(w, "probability") else 1.0,
                        }
                        seg_words.append(w_dict)
                        words_list.append(w_dict)

                segments_list.append({
                    "id": len(segments_list) + 1,
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": seg.text.strip(),
                    "words": seg_words,
                })

            response_data = {
                "language": info.language,
                "language_probability": round(info.language_probability, 3),
                "duration": round(info.duration, 2),
                "segments": segments_list,
                "words": words_list,
            }

            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode("utf-8"))
            print(f"[Faster-Whisper] Done! Generated {len(segments_list)} segments.")

        except Exception as e:
            print(f"[Faster-Whisper] Error: {e}")
            self._send_error_json(500, str(e))
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                except Exception:
                    pass

    def _send_error_json(self, status_code, message):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[Server] {args[0]} {args[1]}\n")


def run_server(port=8000, model="tiny", device="cpu"):
    global DEFAULT_MODEL_SIZE, DEFAULT_DEVICE
    DEFAULT_MODEL_SIZE = model
    DEFAULT_DEVICE = device

    # Preload default model
    get_model(DEFAULT_MODEL_SIZE, DEFAULT_DEVICE)

    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, WhisperRequestHandler)
    print(f"\n=======================================================")
    print(f"  LingoSync AI - Faster-Whisper Transcription Server")
    print(f"  Status: Active & Listening on http://127.0.0.1:{port}")
    print(f"  Model: {model} (Device: {device})")
    print(f"  Press Ctrl+C to stop.")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LingoSync AI Faster-Whisper Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--model", type=str, default="tiny", choices=["tiny", "base", "small", "medium", "large-v3"], help="Whisper model size")
    parser.add_argument("--device", type=str, default="cpu", choices=["cpu", "cuda"], help="Inference device")
    args = parser.parse_args()

    run_server(port=args.port, model=args.model, device=args.device)
