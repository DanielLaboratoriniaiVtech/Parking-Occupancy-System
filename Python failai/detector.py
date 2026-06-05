import cv2
from ultralytics import YOLO
import firebase_admin
from firebase_admin import credentials, firestore
import time
import sys
sys.path.append(".")
import shared_state

cred = credentials.Certificate("bakalauras2026-firebase-adminsdk-fbsvc-d72e0260ec.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

    
db.collection("test").document("ping").set({"ok": True})
print("FIREBASE WRITE DONE")

def send_to_firebase(car_count, people_count):
    db.collection("parkingas").document("live").set({
        "Masinos": car_count,
        "Zmones": people_count
    })

# Modeliai 
def load_models():
    thermal_model = YOLO("best26.pt")
    rgb_model = YOLO("yolo26s.pt")
    return thermal_model, rgb_model


#Video
def init_video(input_path, output_path, width, height):
    cap = cv2.VideoCapture(input_path)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, 20.0, (width, height))
    print('Video paruostas')
    return cap, out


#Detekcija
def run_detections(frame, mode, thermal_model, rgb_model):
    if mode == "thermal":
        thermal_results = thermal_model.track(frame, persist = True, device = 0, conf = 0.5, iou = 0.55, tracker = "bytetrack.yaml", verbose = False)
        return thermal_results, None
    if mode  == "rgb":
        rgb_results = rgb_model.track(frame, persist = True, device = 0, conf = 0.15, iou = 0.55, imgsz=1280, classes=[0, 2, 7] , tracker = "bytetrack.yaml", verbose= False)
        return None, rgb_results
    return None, None


#Rezultatu surinkimas
def collect_detections (thermal_results, rgb_results):
    all_boxes = []
    all_ids = []
    all_classes = []
    all_confs = []
    all_sources = []
    if thermal_results is not None and thermal_results[0].boxes.id is not None:
        for b, i, c, conf in zip(
            thermal_results[0].boxes.xyxy.cpu().numpy(),
            thermal_results[0].boxes.id.cpu().numpy(),
            thermal_results[0].boxes.cls.cpu().numpy(),
            thermal_results[0].boxes.conf.cpu().numpy()
        ):
            all_boxes.append(b)
            all_ids.append(i)
            all_classes.append(c)
            all_confs.append(conf)
            all_sources.append("thermal")

    if rgb_results is not None and rgb_results[0].boxes.id is not None:
        for b, i, c, conf in zip(
            rgb_results[0].boxes.xyxy.cpu().numpy(),
            rgb_results[0].boxes.id.cpu().numpy(),
            rgb_results[0].boxes.cls.cpu().numpy(),
            rgb_results[0].boxes.conf.cpu().numpy()
        ):
            all_boxes.append(b)
            all_ids.append(i)
            all_classes.append(c)
            all_confs.append(conf)
            all_sources.append("rgb")
    return all_boxes, all_ids, all_classes, all_confs, all_sources

    
#Skaiciavimas roi
def process_detection(box, track_id, cls, conf, source, counted_ids, count):
        x1, y1, x2, y2 = map(int, box)

        area = (x2 - x1) * (y2 - y1)
        if area < 1:
            return count
        if int(cls) == 7 and conf < 0.8:
            return count
        
        cx = int((x1 + x2) / 2)
        cy = int((y1 + y2) / 2)

        is_person = False

        if source == "rgb":
            is_person = (int(cls) == 0)
        elif source == "thermal":
            is_person = (int(cls) == 1)

        if x2 > 0 and x1 < 200 and y2 > 400 and y1 < 520:
            key = (source, int(track_id))
            if is_person and key not in counted_ids:
                counted_ids.add(key)
                count += 1

        return count

    
#Piesimas
def draw_detection(frame, box, track_id, cls, conf, source):
        x1, y1, x2, y2 = map(int, box)
        cls_int = int(cls)

        if source == "rgb":
            if cls_int == 2:
                label = "masina"
            elif cls_int == 7:
                label = "Sunkvezimis"
            else:
                label = "zmogus"
        elif source == "thermal":
            if cls_int == 0:
                label = 'masina'
            else:
                label = 'zmogus'
            
        if cls_int == 0:
            color = (0, 255, 0)
        elif cls_int == 1:
            color = (255, 0, 255)
        elif cls_int == 7:
            color = (0, 140, 255)
        else:
            color = (255, 255, 0)

        thickness = 2 if cls_int == 7 else 2

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
        cv2.putText(frame, f"{label} {conf:.2f} ID:{int(track_id)}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
        
             
#ROI
def draw_roi(frame):
    cv2.rectangle(frame,(0,750),(200,520), (0, 255, 255), 2)
    cv2.putText(frame, 'ROI' ,(10,400-10),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,255,255),1)
        
            
#Interface
def draw_ui(frame, count, car_count, mode):
    cv2.putText(frame, f"Zmones: {count}", (20, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    cv2.putText(frame, f"Masinos: {car_count}", (20, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

    cv2.putText(frame, f"Rezimas: {mode.upper()}", (20, 140),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 210), 2)


#masinu skaiciavimas:
def update_car_count(box, track_id, cls, source, car_ids):
    x1, y1, x2, y2 = map(int, box)

    is_car = False

    if source == "rgb":
        is_car = int(cls) in [2, 7]
    elif source == "thermal":
        is_car = int(cls) == 0

    if is_car:
        car_ids.add((source, int(track_id)))
        

        
def valid_detection(cls, conf):
    cls = int(cls)
    if cls == 7 and conf < 0.45:
        return False
    return True

#frame_counter = 0

#Pagrindine funkcija main
def main():
    
    with shared_state.frame_lock:
        shared_state.latest_frame = None
        shared_state.system_running = True
    last_heartbeat = 0
    prev_cars = -1
    prev_people = -1
    last_send = 0

    TARGET_WIDTH = 1280
    TARGET_HEIGHT = 720

    thermal_model, rgb_model = load_models()
    
    cap, out = init_video(
        "parking rgb.mp4",
        "output.mp4",
        TARGET_WIDTH,
        TARGET_HEIGHT
    )
    
    frame_counter = 0
    live_person_ids = set()
    roi_people_ids = set()
    roi_people = 0      
    MODE = "thermal"
    try:
        while True:
            live_person_ids.clear()
            if time.time() - last_heartbeat > 10:
                db.collection("system").document("status").set({
                    "active": True,
                    "timestamp": firestore.SERVER_TIMESTAMP
                })
                last_heartbeat = time.time()

            frame_counter += 1
            frame_car_ids = set()
            ret, frame =cap.read()
            if not ret:
                
                break

            frame = cv2.resize(frame,(TARGET_WIDTH, TARGET_HEIGHT))

            thermal_results, rgb_results = run_detections(frame, MODE, thermal_model, rgb_model)

            detections = collect_detections(thermal_results, rgb_results)

            for box, track_id, cls, conf, source in zip(*detections):
                if not valid_detection(cls, conf):
                    continue

                if source == "rgb":
                    is_person = int(cls) == 0
                elif source == "thermal":
                    is_person = int(cls) == 1
                else:
                    is_person = False

                if is_person:
                    live_person_ids.add((source, int(track_id)))

                update_car_count(box, track_id, cls, source, frame_car_ids )

                roi_people = process_detection(box, track_id, cls, conf, source, roi_people_ids, roi_people)

                draw_detection(frame, box, track_id, cls, conf, source)

            car_count = len(frame_car_ids)
            live_people_count = len(live_person_ids)
            if time.time() - last_send > 2:
                if car_count != prev_cars or live_people_count != prev_people:
                    send_to_firebase(car_count, live_people_count)
                    db.collection("parkingas_history").add({
                        "Masinos": car_count,
                        "Zmones": live_people_count,
                        "timestamp": firestore.SERVER_TIMESTAMP
                    })
                    prev_cars = car_count
                    prev_people = live_people_count
                    last_send = time.time()

            #draw_roi(frame)
            draw_ui(frame, live_people_count, car_count, MODE)

            with shared_state.frame_lock:
                shared_state.latest_frame = frame.copy()

            out.write(frame)
            cv2.imshow("Camera", frame)
            key = cv2.waitKey(1) & 0xFF

            if key == ord('r'):
                MODE = "rgb"
                print("Switched to RGB mode")

            elif key == ord('t'):
                MODE = "thermal"
                print("Switched to THERMAL mode")
            elif key == ord('q'):
                break
    finally:
        cap.release()
        out.release()
        cv2.destroyAllWindows()

        with shared_state.frame_lock:
            shared_state.latest_frame = None
            shared_state.system_running = False
        db.collection("system").document("status").set({
            "active": False,
            "timestamp": firestore.SERVER_TIMESTAMP
        })

        print("Programa sustabdyta, kamera atlaisvinta")
        print(rgb_model.names)
    

if __name__ == "__main__":
    main()