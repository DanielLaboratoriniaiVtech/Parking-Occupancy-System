import threading
# Kintamasis saugo naujausią apdorotą vaizdo kadrą
latest_frame = None
# Užraktas naudojamas saugiam duomenų perdavimui tarp skirtingų gijų
frame_lock = threading.Lock()
# Kintamasis nurodo, ar objektų aptikimo sistema šiuo metu veikia
system_running = False