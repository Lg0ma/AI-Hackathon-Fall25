#!/usr/bin/env python3
"""
Test script to verify Whisper and Ollama are properly installed
Run this in your backend directory: python test_models.py
"""

import sys

def test_whisper():
    """Test Whisper installation and transcription"""
    print("\n=== Testing Whisper ===")
    try:
        from faster_whisper import WhisperModel
        print("= faster-whisper is installed")
        
        # Try to load model
        print("Loading Whisper model (this may take a moment on first run)...")
        model = WhisperModel("base", device="cpu", compute_type="int8")
        print("= Whisper model loaded successfully")
        
        # Test with a simple audio file (optional)
        print("Note: To test transcription, you need an audio file.")
        return True
        
    except ImportError:
        print("x faster-whisper is NOT installed")
        print("   Install with: pip install faster-whisper or check requirements.txt")
        return False
    except Exception as e:
        print(f"= Error loading Whisper: {e}")
        return False


def test_ollama():
    """Test Ollama installation and connection"""
    print("\n=== Testing Ollama ===")
    try:
        import requests
        
        # Check if Ollama service is running
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        
        if response.status_code == 200:
            print("= Ollama service is running")
            
            models = response.json().get("models", [])
            print(f"- Available models: {len(models)}")
            
            for model in models:
                print(f"   - {model.get('name')}")
            
            # Check if mistral is available
            mistral_found = any("mistral" in m.get("name", "").lower() for m in models)
            
            if mistral_found:
                print("= Mistral model is available")
            else:
                print("x  Mistral model NOT found")
                print("   Install with: ollama pull mistral (check requirements.txt)")
            
            return mistral_found
        else:
            print("!Ollama service responded with error")
            return False
            
    except requests.exceptions.ConnectionError:
        print("x Cannot connect to Ollama service")
        print("   Is Ollama installed? Check: https://ollama.com/download")
        print("   Is Ollama running? Try: ollama serve")
        return False
    except ImportError:
        print("x requests library not installed")
        print("   Install with: pip install requests")
        return False
    except Exception as e:
        print(f"Error checking Ollama: {e}")
        return False


def test_ollama_generate():
    """Test Ollama text generation"""
    print("\n=== Testing Ollama Generation ===")
    try:
        import requests
        import json
        
        payload = {
            "model": "mistral",
            "prompt": "Say 'Hello, I am working!' in JSON format: {\"message\": \"...\"}",
            "stream": False
        }
        
        print("Sending test prompt to Mistral...")
        response = requests.post(
            "http://localhost:11434/api/generate",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("= Ollama generation successful")
            print(f"   Response: {result.get('response', '')[:100]}...")
            return True
        else:
            print(f"= Generation failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"= Error testing generation: {e}")
        return False


def main():
    """Run all tests"""
    print("🔍 Checking AI Interview Model Setup...")
    print("=" * 50)
    
    results = {
        "whisper": test_whisper(),
        "ollama": test_ollama(),
        "ollama_generate": False
    }
    
    # Only test generation if Ollama is available
    if results["ollama"]:
        results["ollama_generate"] = test_ollama_generate()
    
    # Summary
    print("\n" + "=" * 50)
    print("=== SUMMARY ===")
    print("=" * 50)
    
    all_passed = all(results.values())
    
    if all_passed:
        print("✅ All systems operational!")
        print("\n Ready to run models")
    else:
        print("  Some components need attention:")
        if not results["whisper"]:
            print("   - Install Whisper: pip install faster-whisper")
        if not results["ollama"]:
            print("   - Install Ollama: https://ollama.com/download")
            print("   - Pull Mistral: ollama pull mistral")
        if results["ollama"] and not results["ollama_generate"]:
            print("   - Mistral model may not be working correctly")
    
    print("\n" + "=" * 50)
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()