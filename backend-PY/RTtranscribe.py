"""
Enhanced Real-time Transcription with faster-whisper
This version uses faster-whisper which is optimized for speed
Install: pip install faster-whisper sounddevice numpy
"""

import sounddevice as sd
import numpy as np
import queue
import threading
import time
from datetime import datetime

# Fallback to regular whisper if faster-whisper not available
try:
    from faster_whisper import WhisperModel
    try:
        from faster_whisper.utils import download_model
    except ImportError:
        download_model = None  # Older version of faster-whisper
    USE_FASTER_WHISPER = True
except ImportError:
    import whisper
    USE_FASTER_WHISPER = False
    download_model = None
    print("  faster-whisper not found. Using standard whisper (slower).")
    print("   Install faster-whisper for better performance: pip install faster-whisper")


def ensure_model_downloaded(model_name, max_retries=3):
    """
    Ensure the model is downloaded before starting transcription.
    Tries multiple times with better error messages.
    """
    if not USE_FASTER_WHISPER or download_model is None:
        return  # Standard whisper downloads automatically, or older faster-whisper

    print(f"\n📥 Checking model '{model_name}'...")

    for attempt in range(max_retries):
        try:
            # Try to download/verify the model
            print(f"   Attempt {attempt + 1}/{max_retries}...")
            model_path = download_model(model_name, local_files_only=False)
            print(f" Model ready at: {model_path}")
            return model_path
        except Exception as e:
            error_msg = str(e)

            if "getaddrinfo failed" in error_msg or "Failed to resolve" in error_msg:
                print(f" Network error: Cannot reach huggingface.co")
                print(f"   Please check your internet connection.")
                if attempt < max_retries - 1:
                    print(f"   Retrying in 3 seconds...")
                    time.sleep(3)
            elif "LocalEntryNotFoundError" in error_msg:
                print(f" Model not in cache and cannot download.")
                print(f"   Troubleshooting:")
                print(f"   1. Check internet connection")
                print(f"   2. Try: ping huggingface.co")
                print(f"   3. Disable firewall/VPN temporarily")
                print(f"   4. Or download manually from browser")
                break
            else:
                print(f" Error: {error_msg}")
                if attempt < max_retries - 1:
                    print(f"   Retrying...")
                    time.sleep(2)

    # If all retries failed, try to use cached version
    print(f"\n💡 Attempting to use cached version only...")
    try:
        model_path = download_model(model_name, local_files_only=True)
        print(f" Using cached model at: {model_path}")
        return model_path
    except Exception:
        print(f"\n Could not download or find cached model '{model_name}'")
        print(f"\nTo fix this:")
        print(f"1. Connect to internet and ensure you can access: https://huggingface.co")
        print(f"2. Run: ping huggingface.co")
        print(f"3. Try with a smaller model first: 'base' or 'small'")
        print(f"4. Or use standard whisper: pip install openai-whisper")
        raise RuntimeError(f"Cannot load model '{model_name}'. Please check internet connection.")


class StreamingTranscriber:
    def __init__(
        self, 
        model_name="large-v2",
        sample_rate=16000,
        chunk_duration=2,
        silence_threshold=0.01,
        # TODO: Change back the devie type to cuda so that its faster
        device="cpu"  # or "cuda" if you have GPU
    ):
        """
        Streaming transcriber with optimized performance
        
        Args:
            model_name: Model size (tiny, base, small, medium, large)
            sample_rate: Audio sample rate (16kHz for Whisper)
            chunk_duration: Seconds of audio to accumulate
            silence_threshold: Energy threshold for silence detection
            device: "cpu" or "cuda"
        """
        print(f" Loading Whisper '{model_name}' model...")
        
        if USE_FASTER_WHISPER:
            # faster-whisper is much more efficient
            # float16 for GPU is optimal (faster than float32, accurate enough)
            compute_type = "int8" if device == "cpu" else "float16"

            # Try loading with local_files_only first, then try downloading
            try:
                print(f"   Attempting to load from local cache...")
                self.model = WhisperModel(
                    model_name,
                    device=device,
                    compute_type=compute_type,
                    num_workers=4,
                    local_files_only=True  # Use cached model only
                )
                print(f" Using faster-whisper ({device.upper()}, {compute_type} precision) [CACHED]")
            except Exception:
                print(f"   Local cache not found, attempting download...")
                self.model = WhisperModel(
                    model_name,
                    device=device,
                    compute_type=compute_type,
                    num_workers=4,
                    local_files_only=False
                )
                print(f" Using faster-whisper ({device.upper()}, {compute_type} precision) [DOWNLOADED]")
        else:
            # Fallback to standard whisper
            self.model = whisper.load_model(model_name)
            print(" Using standard whisper")
        
        self.sample_rate = sample_rate
        self.chunk_duration = chunk_duration
        self.chunk_samples = int(sample_rate * chunk_duration)
        self.silence_threshold = silence_threshold
        
        # Buffers and queues
        self.audio_queue = queue.Queue()
        self.audio_buffer = []
        self.text_buffer = []
        
        # State
        self.is_recording = False
        self.last_speech_time = time.time()
        self.speech_detected = False
        
        # Threading
        self.transcription_thread = None
        self.lock = threading.Lock()
        
    def audio_callback(self, indata, frames, time_info, status):
        """Callback for audio input"""
        if status:
            print(f"  {status}")
        self.audio_queue.put(indata.copy())
    
    def get_energy(self, audio):
        """Calculate RMS energy"""
        return np.sqrt(np.mean(audio ** 2))
    
    def transcribe_chunk(self, audio_data):
        """Transcribe audio chunk"""
        try:
            # Normalize
            audio_data = audio_data.astype(np.float32)
            max_val = np.max(np.abs(audio_data))
            if max_val > 0:
                audio_data = audio_data / max_val
            
            timestamp = datetime.now().strftime("%H:%M:%S")
            
            if USE_FASTER_WHISPER:
                # faster-whisper API - auto-detect between English and Spanish
                segments, info = self.model.transcribe(
                    audio_data,
                    language=None,  # Auto-detect
                    beam_size=5,  # Higher = more accurate (1-10, default 5)
                    best_of=5,  # Sample 5 candidates, pick best
                    temperature=0.0,  # Deterministic (more consistent)
                    vad_filter=True,  # Voice activity detection
                    vad_parameters=dict(
                        min_silence_duration_ms=500,
                        threshold=0.5  # Voice detection sensitivity
                    ),
                    condition_on_previous_text=True  # Use context from previous segments
                )

                # Check detected language
                detected_lang = info.language
                lang_emoji = "🇺🇸" if detected_lang == "en" else "🇪🇸" if detected_lang == "es" else "🌐"

                # Only process English or Spanish
                if detected_lang not in ["en", "es"]:
                    # If not English/Spanish, try forcing Spanish (common false detection)
                    segments, info = self.model.transcribe(
                        audio_data,
                        language="es",  # Force Spanish
                        beam_size=5,
                        best_of=5,
                        temperature=0.0,
                        vad_filter=True,
                        vad_parameters=dict(
                            min_silence_duration_ms=500,
                            threshold=0.5
                        ),
                        condition_on_previous_text=True
                    )
                    detected_lang = "es"
                    lang_emoji = "🇪🇸"

                # Collect all segments
                text = " ".join([segment.text for segment in segments]).strip()

                # Add language indicator to text
                if text:
                    text = f"{lang_emoji} {text}"
            else:
                # Standard whisper API
                result = self.model.transcribe(
                    audio_data,
                    language="en",
                    fp16=False,
                    verbose=False
                )
                text = result["text"].strip()

            if text:
                print(f"\n[{timestamp}] {text}")
                with self.lock:
                    self.text_buffer.append({
                        "timestamp": timestamp,
                        "text": text
                    })
                return text
            
        except Exception as e:
            print(f" Transcription error: {e}")
        
        return ""
    
    def process_audio_stream(self):
        """Main processing loop"""
        print(" Audio processing started\n")
        
        silence_duration = 0
        
        while self.is_recording:
            try:
                # Get audio chunk
                audio_chunk = self.audio_queue.get(timeout=0.1)
                
                # Handle stereo
                if len(audio_chunk.shape) > 1:
                    audio_chunk = audio_chunk.mean(axis=1)
                
                # Add to buffer
                self.audio_buffer.append(audio_chunk)
                
                # Check energy
                energy = self.get_energy(audio_chunk)
                
                # Detect speech
                if energy > self.silence_threshold:
                    self.speech_detected = True
                    self.last_speech_time = time.time()
                    silence_duration = 0
                else:
                    if self.speech_detected:
                        silence_duration = time.time() - self.last_speech_time
                
                # Get buffer size
                total_samples = sum(len(chunk) for chunk in self.audio_buffer)
                buffer_duration = total_samples / self.sample_rate
                
                # Decide when to transcribe
                should_transcribe = False
                
                # Option 1: Fixed chunk duration reached
                if buffer_duration >= self.chunk_duration:
                    should_transcribe = True
                
                # Option 2: Silence after speech (more natural breaks)
                if self.speech_detected and silence_duration >= 0.8:
                    should_transcribe = True
                
                # Option 3: Too much audio accumulated
                if buffer_duration >= 5.0:
                    should_transcribe = True
                
                # Transcribe if conditions met
                if should_transcribe and self.audio_buffer:
                    # Concatenate buffer
                    audio_data = np.concatenate(self.audio_buffer)
                    
                    # Only transcribe if there's speech
                    if self.get_energy(audio_data) > self.silence_threshold * 0.3:
                        print(" ", end="", flush=True)
                        self.transcribe_chunk(audio_data)
                    
                    # Clear buffer
                    self.audio_buffer = []
                    self.speech_detected = False
                    silence_duration = 0
                    
            except queue.Empty:
                continue
            except Exception as e:
                print(f" Processing error: {e}")
    
    def start(self):
        """Start recording and transcription"""
        print("\n" + "="*60)
        print("  REAL-TIME TRANSCRIPTION")
        print("="*60)
        print(f"Model: {self.model.__class__.__name__}")
        print(f"Sample Rate: {self.sample_rate} Hz")
        print(f"Chunk Duration: {self.chunk_duration}s")
        print("\n Speak clearly into your microphone")
        print("⏸ Pause briefly between sentences for best results")
        print(" Press Ctrl+C to stop\n")
        print("="*60 + "\n")
        
        self.is_recording = True
        
        # Start processing thread
        self.transcription_thread = threading.Thread(
            target=self.process_audio_stream,
            daemon=True
        )
        self.transcription_thread.start()
        
        # Start audio stream
        with sd.InputStream(
            samplerate=self.sample_rate,
            channels=1,
            callback=self.audio_callback,
            blocksize=int(self.sample_rate * 0.1)
        ):
            try:
                while self.is_recording:
                    time.sleep(0.1)
            except KeyboardInterrupt:
                self.stop()
    
    def stop(self):
        """Stop recording"""
        print("\n\n" + "="*60)
        print(" Stopping transcription...")
        
        self.is_recording = False
        
        if self.transcription_thread:
            self.transcription_thread.join(timeout=2)
        
        # Print summary
        with self.lock:
            if self.text_buffer:
                print("\n TRANSCRIPTION SUMMARY:")
                print("="*60)
                for item in self.text_buffer:
                    print(f"[{item['timestamp']}] {item['text']}")
                print("="*60)
        
        print(" Stopped\n")
    
    def get_transcript(self):
        """Get all transcribed text"""
        with self.lock:
            return [item["text"] for item in self.text_buffer]


def main():
    # Configuration
    CONFIG = {
        "model_name": "large-v3",  # tiny, base, small, medium, large-v2, large-v3
                                   # large-v3 = best accuracy for bilingual
        "sample_rate": 16000,      # Whisper uses 16kHz
        "chunk_duration": 3,       # Process every 3 seconds (longer = more context)
        "silence_threshold": 0.01,  # Adjust for your mic sensitivity
        "device": "cuda"           # "cuda" for GPU (much faster) or "cpu"
    }

    print("\n🌐 Bilingual Transcription: English 🇺🇸 & Spanish 🇪🇸")

    # Download model if needed (with retries and better error messages)
    try:
        ensure_model_downloaded(CONFIG["model_name"])
    except RuntimeError as e:
        print(f"\n❌ Failed to load model: {e}")
        print("\n💡 Tip: Try starting with a smaller model like 'base' or 'small'")
        return

    transcriber = StreamingTranscriber(**CONFIG)
    
    try:
        transcriber.start()
    except Exception as e:
        print(f" Error: {e}")
        transcriber.stop()


if __name__ == "__main__":
    main()