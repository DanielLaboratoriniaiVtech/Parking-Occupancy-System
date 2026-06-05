import threading
import detector
from server import app

def run_detector():
    detector.main()
    
if __name__ == "__main__":
    detector_thread = threading.Thread(target = run_detector, daemon =True)
    detector_thread.start()
    
    app.run(host ="0.0.0.0", port=5000, debug =False, threaded=True)