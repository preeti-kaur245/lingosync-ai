@echo off
echo ========================================================
echo   LingoSync AI - Local Faster-Whisper & FFmpeg Server
echo ========================================================
echo.
echo Starting local AI server on http://127.0.0.1:8000 ...
echo Fast, 100% free offline speech recognition and translation.
echo Keep this window open while using LingoSync AI.
echo.
python server/whisper_server.py
pause
