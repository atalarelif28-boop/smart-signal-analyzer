from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from scipy.signal import butter, filtfilt, iirnotch
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze_signal")
async def analyze_signal(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    
    signal = df['signal'].values
    
    # 50Hz Notch Filter
    fs = 100.0  # Örnekleme frekansı
    f0 = 50.0   # Filtrelenecek frekans
    Q = 30.0    # Kalite faktörü
    b, a = iirnotch(f0, Q, fs)
    filtered_signal = filtfilt(b, a, signal)
    
    return {
        "raw_signal": signal.tolist(),
        "filtered_signal": filtered_signal.tolist(),
        "stats": {
            "max": float(np.max(signal)),
            "min": float(np.min(signal))
        }
    }

