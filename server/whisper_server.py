#!/usr/bin/env python3
"""
LingoSync AI - Local AI Backend Server
1. Fast local voice-to-text with word-level timestamps (faster-whisper)
2. Native FFmpeg video cutting & reframing for short clips (imageio-ffmpeg)
"""

import sys
import os
import json
import tempfile
import argparse
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

# PyAV 19 compatibility patch for faster-whisper
try:
    import av
    _orig_av_open = av.open
    def _patched_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _patched_av_open
except Exception:
    pass

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("Error: faster-whisper is not installed. Please install it using: pip install faster-whisper")
    sys.exit(1)

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"

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


def render_ffmpeg_clip(input_path, output_path, start, end, aspect_ratio="9:16", reframing="center_crop"):
    """
    Cut and reframe video segment using FFmpeg
    """
    cmd = [
        FFMPEG_EXE,
        "-y",
        "-ss", str(start),
        "-to", str(end),
        "-i", input_path,
    ]

    # Video filter chain
    if aspect_ratio == "9:16":
        if reframing == "blurred_background":
            cmd += [
                "-filter_complex",
                "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];"
                "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
                "[bg][fg]overlay=(W-w)/2:(H-h)/2",
            ]
        else:
            # Center crop to 9:16
            cmd += [
                "-vf",
                "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920",
            ]
    elif aspect_ratio == "1:1":
        cmd += [
            "-vf",
            "crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080",
        ]

    cmd += [
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]

    print(f"[FFmpeg] Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error: {result.stderr.decode('utf-8', errors='ignore')}")


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
                "service": "lingosync-backend",
                "whisper": "1.2.1",
                "ffmpeg": os.path.exists(FFMPEG_EXE) if FFMPEG_EXE else False,
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

        # Route 1: FFmpeg Clip Cutting & Reframing
        if parsed.path == "/clips/render":
            self.handle_clip_render()
            return

        # Route 2: Faster-Whisper Speech Recognition
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
        task = query_params.get("task", ["translate"])[0]
        if task not in ("translate", "transcribe"):
            task = "translate"

        content_length = int(self.headers.get("Content-Length", 0))
        content_type = self.headers.get("Content-Type", "")

        if content_length == 0:
            self._send_error_json(400, "Empty request body.")
            return

        body = self.rfile.read(content_length)
        temp_file_path = None

        try:
            if "application/json" in content_type:
                data = json.loads(body.decode("utf-8"))
                file_path = data.get("filePath")
                if not file_path or not os.path.exists(file_path):
                    self._send_error_json(400, f"File path not found: {file_path}")
                    return
                audio_input = file_path
            else:
                if "multipart/form-data" in content_type:
                    boundary = content_type.split("boundary=")[-1].strip().strip('"').strip("'")
                    boundary_bytes = ("--" + boundary).encode()
                    parts = body.split(boundary_bytes)
                    file_bytes = None
                    for part in parts:
                        if b'filename="' in part:
                            header_end = part.find(b"\r\n\r\n")
                            if header_end != -1:
                                raw_chunk = part[header_end + 4 :]
                                if raw_chunk.endswith(b"\r\n"):
                                    raw_chunk = raw_chunk[:-2]
                                if raw_chunk.endswith(b"--"):
                                    raw_chunk = raw_chunk[:-2]
                                file_bytes = raw_chunk
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
            print(f"[Faster-Whisper] Starting {task} (model={model_size}, lang={language or 'auto'}, task={task})...")

            segments_generator, info = model.transcribe(
                audio_input,
                beam_size=5,
                word_timestamps=True,
                vad_filter=True,
                language=language,
                task=task,
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

    def handle_clip_render(self):
        """
        Handle FFmpeg video cutting & reframing
        """
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        temp_in = None
        temp_out = None

        try:
            data = json.loads(body.decode("utf-8"))
            start = float(data.get("start", 0))
            end = float(data.get("end", 15))
            aspect_ratio = data.get("aspectRatio", "9:16")
            reframing = data.get("reframingMode", "center_crop")
            file_path = data.get("filePath")

            if not file_path or not os.path.exists(file_path):
                self._send_error_json(400, "File path not specified or does not exist.")
                return

            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_out:
                temp_out = tmp_out.name

            render_ffmpeg_clip(file_path, temp_out, start, end, aspect_ratio, reframing)

            with open(temp_out, "rb") as f:
                output_bytes = f.read()

            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", str(len(output_bytes)))
            self.end_headers()
            self.wfile.write(output_bytes)

        except Exception as e:
            print(f"[FFmpeg Render Error]: {e}")
            self._send_error_json(500, str(e))
        finally:
            if temp_out and os.path.exists(temp_out):
                try:
                    os.remove(temp_out)
                except Exception:
                    pass

    def _send_error_json(self, status_code, message):
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))

    def log_message(self, format, *args):
        sys.stderr.write(f"[Server] {args[0]} {args[1]}\n")


def run_server(port=8000, model="tiny", device="cpu"):
    global DEFAULT_MODEL_SIZE, DEFAULT_DEVICE
    DEFAULT_MODEL_SIZE = model
    DEFAULT_DEVICE = device

    get_model(DEFAULT_MODEL_SIZE, DEFAULT_DEVICE)

    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, WhisperRequestHandler)
    print(f"\n=======================================================")
    print(f"  LingoSync AI - AI Backend Server (Whisper + FFmpeg)")
    print(f"  Status: Active & Listening on http://127.0.0.1:{port}")
    print(f"  Whisper Model: {model} (Device: {device})")
    print(f"  FFmpeg Binary: {FFMPEG_EXE}")
    print(f"  Press Ctrl+C to stop.")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LingoSync AI Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--model", type=str, default="tiny", choices=["tiny", "base", "small", "medium", "large-v3"], help="Whisper model size")
    parser.add_argument("--device", type=str, default="cpu", choices=["cpu", "cuda"], help="Inference device")
    args = parser.parse_args()

    run_server(port=args.port, model=args.model, device=args.device)
