# Parking Occupancy System

A smart parking occupancy detection system that monitors parking spaces and determines whether they are occupied or available in real time using YOLO-based object detection.

## Features

- Real-time parking space monitoring
- Occupied and available slot detection
- Visual parking space status display
- Occupancy statistics
- YOLO model integration
- Easy deployment and configuration
- Ability to switch between different YOLO models

## Technologies

- Python
- OpenCV
- NumPy
- YOLO
- FLASK
- FIREBASE

## Installation

1. Clone the repository:

```bash
git clone https://github.com/DanielLaboratoriniaiVtech/Parking-Occupancy-System.git
cd Parking-Occupancy-System
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Usage

Run the application:

```bash
python main.py
```

## Model Selection

The system supports multiple YOLO models for inference. You can switch between:

- **YOLOv11n-T (Thermal model)** – Faster inference, lower resource usage, only works with thermal video.
- **YOLOv11n-R (RGB model)** – Higher accuracy, more computationally intensive.

To change the model, during the Video stream press R for RGB or press T for Thermal model.

## Project Structure

```text
Parking-Occupancy-System/
│
├── models/
├── data/
├── src/
├── requirements.txt
├── main.py
└── README.md
```

## How It Works

1. Captures images or video from a parking area.
2. Uses a YOLO model to detect vehicles.
3. Determines parking space occupancy.
4. Displays occupancy status and statistics in real time.

## Future Improvements

- Web dashboard
- Mobile application support
- Historical occupancy analytics
- Cloud deployment
- Multi-camera support

## Author

Daniel Petruskevic

GitHub: https://github.com/DanielLaboratoriniaiVtech

## License

This project is intended for educational and research purposes.
