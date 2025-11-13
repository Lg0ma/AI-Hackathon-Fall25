import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

const transcribeUrl = `${API_BASE_URL}/interview-room/transcribe-and-analyze`;

interface Question {
    id: number;
    text: string;
    expectedKeywords?: string[];
}

interface AnalysisResult {
    isCorrect: boolean;
    transcript: string;
    feedback: string;
    detectedKeywords: string[];
    missingKeywords: string[];
}

interface AIInterviewRoomProps {
    questions: Question[];
    onComplete: (results: AnalysisResult[]) => void;
    jobId?: string;
}

const AIInterviewRoom: React.FC<AIInterviewRoomProps> = ({ 
    questions, 
    onComplete,
    jobId 
}) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isReading, setIsReading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [allResults, setAllResults] = useState<AnalysisResult[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [speechError, setSpeechError] = useState(false);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const audioStream = useRef<MediaStream | null>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const currentQuestion = questions[currentQuestionIndex];

    // Text-to-Speech: Read question aloud
    const speakQuestion = (questionText: string) => {
    setSpeechError(false);
    
    if (!('speechSynthesis' in window)) {
        console.error('Speech synthesis not supported');
        setSpeechError(true);
        return;
    }

    // DEBUG lines when audio is not being reproduced, if not hearing anything
    // browser is most likely the issue
    console.log("🔍 Checking speech synthesis status...");
    console.log("Speech synthesis supported:", 'speechSynthesis' in window);
    console.log("Voices loaded:", window.speechSynthesis.getVoices());
    console.log("Currently speaking:", window.speechSynthesis.speaking);


    // Clear any existing fallback timeout
    if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
    }

    setIsReading(true);
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    console.log("Available voices: ", voices);

    const englishVoice = 
        voices.find(v => v.lang.startsWith("en")) || 
        voices.find(v => v.lang.includes("US")) ||
        voices[0];
    
    // Small delay to ensure cancel completes
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(questionText);
        utterance.voice = englishVoice;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        let hasEnded = false;
        
        utterance.onend = () => {
        if (hasEnded) return; // Prevent double-trigger
        hasEnded = true;
        
        console.log('Speech synthesis ended successfully');
        setIsReading(false);
        
        // Clear fallback timeout
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }
        
        // Auto-start recording after question is read
        // setTimeout(() => startRecording(), 500);
    };
    
    utterance.onerror = (event) => {
        if (hasEnded) return; // Prevent double-trigger
        hasEnded = true;
        
        console.error('Speech synthesis error:', event.error);
        setIsReading(false);
        
        // Clear fallback timeout
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }
        
        // Only show error if it's not a cancel event
        if (event.error !== 'canceled') {
            setSpeechError(true);
        }
    };
    
    synthRef.current = utterance;
    
    // Set fallback timeout (5 seconds)
    fallbackTimeoutRef.current = setTimeout(() => {
        if (isReading && !hasEnded) {
            console.log('Speech timeout - stopping speech');
            hasEnded = true;
            window.speechSynthesis.cancel();
            setIsReading(false);
            setSpeechError(true);
        }
    }, 5000);
    
    try {
        window.speechSynthesis.speak(utterance);
        console.log("Currently speaking:", window.speechSynthesis.speaking);
    } catch (error) {
        console.error('Failed to start speech:', error);
        hasEnded = true;
        setIsReading(false);
        setSpeechError(true);
        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }
    }
    }, 100);
};

  // Start recording user's answer
const startRecording = async () => {
try {
    audioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = '';
    }

    mediaRecorder.current = new MediaRecorder(
    audioStream.current,
    mimeType ? { mimeType } : {}
    );

    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (event) => {
    if (event.data.size > 0) {
        audioChunks.current.push(event.data);
    }
    };

    mediaRecorder.current.onstop = async () => {
    const audioBlob = new Blob(audioChunks.current, { type: mimeType });
    console.log("AudioBlob: ", audioBlob)
    await analyzeResponse(audioBlob);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
} catch (error) {
    console.error('Microphone access error:', error);
    alert('Please allow microphone access to continue the interview.');
}
};

// Stop recording
const stopRecording = () => {
if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
    mediaRecorder.current.stop();
    setIsRecording(false);
}
if (audioStream.current) {
    audioStream.current.getTracks().forEach(track => track.stop());
}
};

// Analyze the recorded response using backend AI
const analyzeResponse = async (audioBlob: Blob) => {
setIsAnalyzing(true);
setCurrentTranscript('');
setAnalysisResult(null);

try {
    // Step 1: Transcribe audio using Whisper
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'response.webm');
    formData.append('question', currentQuestion.text);

    // Add expected keywords if available
    if (currentQuestion.expectedKeywords && currentQuestion.expectedKeywords.length > 0) {
        formData.append('expected_keywords', currentQuestion.expectedKeywords.join(','));
    }    
    
    console.log('Sending to backend:', {
        question: currentQuestion.text,
        keywords: currentQuestion.expectedKeywords,
        audioBlobSize: audioBlob.size
    });

    const response = await fetch(transcribeUrl, {
    method: 'POST',
    body: formData,
    });

    if (!response.ok) {
    throw new Error('Failed to analyze response');
    }

    const data = await response.json();
    
    // Extract results
    const result: AnalysisResult = {
    isCorrect: data.is_correct || false,
    transcript: data.transcript || '',
    feedback: data.feedback || '',
    detectedKeywords: data.detected_keywords || [],
    missingKeywords: data.missing_keywords || [],
    };

    setCurrentTranscript(result.transcript);
    setAnalysisResult(result);
    setShowResult(true);

    // Add to results history
    setAllResults(prev => [...prev, result]);

} catch (error) {
    console.error('Analysis error:', error);
    alert('Failed to analyze your response. Please try again.');
} finally {
    setIsAnalyzing(false);
}
};

// Move to next question
const handleNextQuestion = () => {
    setShowResult(false);
    setCurrentTranscript('');
    setAnalysisResult(null);

    if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
    } else {
        // Interview complete
        onComplete(allResults);
    }
};

  // Retry current question
const handleRetry = () => {
    setShowResult(false);
    setCurrentTranscript('');
    setAnalysisResult(null);
    speakQuestion(currentQuestion.text);
};

// Auto-read question when it changes
useEffect(() => {
if (currentQuestion && !showResult) {
    // Small delay before starting speech
    const timer = setTimeout(() => {
    speakQuestion(currentQuestion.text);
    }, 500);
    
    return () => clearTimeout(timer);
}
}, [currentQuestionIndex]);

// Cleanup
useEffect(() => {
    return () => {
        window.speechSynthesis.cancel();
        if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        }
        if (audioStream.current) {
        audioStream.current.getTracks().forEach(track => track.stop());
        }
    };
}, []);

return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
        <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
            </div>
            </div>

            {/* Main Interview Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Question Display */}
            <div className="mb-8">
                <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    isReading ? 'bg-blue-600 animate-pulse' : 'bg-gray-200'
                }`}>
                    <Volume2 className={`w-6 h-6 ${isReading ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {currentQuestion.text}
                    </h2>
                    {isReading && (
                    <p className="text-sm text-blue-600 animate-pulse">
                        Reading question aloud...
                    </p>
                    )}
                </div>
                </div>
            </div>

            {/* Recording Status */}
            {!showResult && (
                <div className="mb-8">
                {isRecording ? (
                    <div className="text-center">
                    <div className="flex justify-center items-center mb-4">
                        <div className="relative">
                        <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                            <Mic className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-25" />
                        </div>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 mb-2">Recording your answer...</p>
                    <p className="text-sm text-gray-600 mb-4">Speak clearly and naturally</p>
                    <button
                        onClick={stopRecording}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <MicOff className="inline w-5 h-5 mr-2" />
                        Stop Recording
                    </button>
                    </div>
                ) : isAnalyzing ? (
                    <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4" />
                    <p className="text-lg font-semibold text-gray-800">Analyzing your response...</p>
                    <p className="text-sm text-gray-600">Please wait</p>
                    </div>
                ) : isReading ? (
                    <div className="text-center">
                    <div className="inline-block animate-pulse mb-4">
                        <Volume2 className="w-16 h-16 text-blue-600" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800 mb-2">Reading question...</p>
                    <p className="text-sm text-gray-600 mb-4">Recording will start automatically</p>
                    <button
                        onClick={() => {
                        window.speechSynthesis.cancel();
                        if (fallbackTimeoutRef.current) {
                            clearTimeout(fallbackTimeoutRef.current);
                            fallbackTimeoutRef.current = null;
                        }
                        setIsReading(false);
                        startRecording();
                        }}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Skip & Start Recording
                    </button>
                    </div>
                ) : speechError ? (
                    <div className="text-center">
                    <p className="text-orange-600 mb-4">
                        ⚠️ Voice playback unavailable. Please read the question above and click below to answer.
                    </p>
                    <button
                        onClick={() => {
                        setSpeechError(false);
                        startRecording();
                        }}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Mic className="inline w-5 h-5 mr-2" />
                        Start Recording
                    </button>
                    
                    </div>
                ) : (
                    <div className="text-center">
                    <p className="text-gray-600 mb-4">Ready to answer?</p>
                    {/* <button onClick={() => speakQuestion("Testing one two three")}>
                        Test Speech
                    </button> */}
                    <button
                        onClick={() => startRecording()}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Mic className="inline w-5 h-5 mr-2" />
                        Start Recording
                    </button>
                    </div>
                )}
                </div>
            )}

            {/* Result Display */}
            {showResult && analysisResult && (
                <div className="space-y-6">
                {/* Transcript */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-blue-600">📝</span>
                    Your Response:
                    </h3>
                    <p className="text-gray-700 italic">"{currentTranscript}"</p>
                </div>

                {/* Analysis Result */}
                <div className={`rounded-lg p-6 border-2 ${
                    analysisResult.isCorrect 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                    <div className="flex items-start gap-3 mb-3">
                    {analysisResult.isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                        <XCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                        <h3 className={`font-semibold text-lg mb-2 ${
                        analysisResult.isCorrect ? 'text-green-800' : 'text-orange-800'
                        }`}>
                        {analysisResult.isCorrect ? 'Great Answer!' : 'Needs Improvement'}
                        </h3>
                        <p className="text-gray-700">{analysisResult.feedback}</p>
                    </div>
                    </div>

                    {/* Keywords Analysis */}
                    {analysisResult.detectedKeywords.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">✅ Detected Keywords:</h4>
                        <div className="flex flex-wrap gap-2">
                        {analysisResult.detectedKeywords.map((keyword, idx) => (
                            <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            {keyword}
                            </span>
                        ))}
                        </div>
                    </div>
                    )}

                    {analysisResult.missingKeywords.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">❌ Missing Keywords:</h4>
                        <div className="flex flex-wrap gap-2">
                        {analysisResult.missingKeywords.map((keyword, idx) => (
                            <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                            {keyword}
                            </span>
                        ))}
                        </div>
                    </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    {!analysisResult.isCorrect && (
                    <button
                        onClick={handleRetry}
                        className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        Try Again
                    </button>
                    )}
                    <button
                    onClick={handleNextQuestion}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                    {currentQuestionIndex < questions.length - 1 ? (
                        <>Next Question <ArrowRight className="w-5 h-5" /></>
                    ) : (
                        'Complete Interview'
                    )}
                    </button>
                </div>
                </div>
            )}
            </div>

            {/* Results Summary */}
            {allResults.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Progress Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <div className="text-2xl font-bold text-blue-600">{allResults.length}</div>
                    <div className="text-sm text-gray-600">Answered</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-green-600">
                    {allResults.filter(r => r.isCorrect).length}
                    </div>
                    <div className="text-sm text-gray-600">Correct</div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-orange-600">
                    {allResults.filter(r => !r.isCorrect).length}
                    </div>
                    <div className="text-sm text-gray-600">Needs Work</div>
                </div>
                </div>
            </div>
            )}
        </div>
        </div>
    );
};

export default AIInterviewRoom;