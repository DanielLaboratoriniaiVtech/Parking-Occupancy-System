from flask import Flask, Response, jsonify
import cv2
import time
import shared_state
from flask_cors import CORS
# Sukuriamas Flask serverio objektas
app = Flask(__name__)
# Funkcija generuoja apdorotus vaizdo kadrus MJPEG formatu
def generate_frames():
    while True:
        # Saugiai nuskaitomas naujausias kadras iš bendros būsenos modulio
        with shared_state.frame_lock:
            frame = shared_state.latest_frame
            system_running = getattr(shared_state, "system_running", False)
            
            # Jei sistema nebeveikia, vaizdo srauto generavimas nutraukiamas
            if frame is not None:
                frame = frame.copy()
                
        if not system_running:
            break
        # Jei kadras dar negautas, trumpai palaukiama
        if frame is None:
            time.sleep(0.01)
            continue
        # Kadras užkoduojamas JPG formatu
        success, buffer = cv2.imencode(".jpg", frame)
        if not success:
            time.sleep(0.05)
            continue
                
        frame_bytes = buffer.tobytes()
        # Kadras grąžinamas naršyklei kaip MJPEG srauto dalis        
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
# Maršrutas, per kurį WEB sąsaja gauna tiesioginį vaizdo srautą
@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype = "multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
@app.route("/health")
def health():
    return jsonify({"ok": True})