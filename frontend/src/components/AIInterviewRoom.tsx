import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, CheckCircle, XCircle, ArrowRight, House } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface Question {
    id: number;
    text: string;
    expectedKeywords?: string[];
}

interface Skill {
    skill: string;
    category: string;
}

interface AnalysisResult {
    isCorrect: boolean;
    transcript: string;
    feedback: string;
    detectedKeywords: string[];
    missingKeywords: string[];
}

interface AIInterviewRoomProps {
    jobDescription: string;
    jobTitle: string;
    jobId?: string;
    onComplete: (results: AnalysisResult[]) => void;
}

type InterviewState = 'initializing' | 'ready' | 'active' | 'error';

const AIInterviewRoom: React.FC<AIInterviewRoomProps> = ({ 
    jobDescription,
    jobTitle,
    jobId,
    onComplete
}) => {
    // Interview setup state
    const [interviewState, setInterviewState] = useState<InterviewState>('initializing');
    const [setupError, setSetupError] = useState<string | null>(null);
    const [extractedSkills, setExtractedSkills] = useState<Skill[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Interview progress state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isReading, setIsReading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [allResults, setAllResults] = useState<AnalysisResult[]>([]);
    const [showResult, setShowResult] = useState(false);
    const [speechError, setSpeechError] = useState(false);

    // Recording refs
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const audioStream = useRef<MediaStream | null>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const currentQuestion = questions[currentQuestionIndex];
    const navigate = useNavigate();

    const goHome = () => {
        navigate('/home');
    }

    // ===========================
    // INITIALIZATION: Extract Skills & Generate Questions
    // ===========================
    useEffect(() => {
        const initializeInterview = async () => {
            console.log('[AIInterviewRoom] ========================================');
            console.log('[AIInterviewRoom] INITIALIZING INTERVIEW');
            console.log('[AIInterviewRoom] ========================================');
            console.log('[AIInterviewRoom] Job:', jobTitle);
            console.log('[AIInterviewRoom] Job description length:', jobDescription.length);

            try {
                // Step 1: Extract skills from job description
                console.log('[AIInterviewRoom] Step 1: Extracting skills...');
                const skillsResponse = await fetch(`${API_BASE_URL}/ai/extract-skills`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ job_description: jobDescription }),
                });

                if (!skillsResponse.ok) {
                    throw new Error(`Failed to extract skills: ${skillsResponse.status}`);
                }

                const skillsData = await skillsResponse.json();
                console.log('[AIInterviewRoom] ✅ Skills extracted:', skillsData.skills.length);
                console.log('[AIInterviewRoom] Skills:', skillsData.skills);
                setExtractedSkills(skillsData.skills);

                // Step 2: Generate interview questions based on skills
                console.log('[AIInterviewRoom] Step 2: Generating questions...');
                const questionsResponse = await fetch(`${API_BASE_URL}/ai/generate-questions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        skills: skillsData.skills, 
                        max_questions: 8
                    }),
                });

                if (!questionsResponse.ok) {
                    throw new Error(`Failed to generate questions: ${questionsResponse.status}`);
                }

                const questionsData = await questionsResponse.json();
                console.log('[AIInterviewRoom] ✅ Questions generated:', questionsData.questions.length);
                console.log('[AIInterviewRoom] Questions:', questionsData.questions);

                // Convert to Question format with keywords from skills
                const formattedQuestions: Question[] = questionsData.questions.map((q: string, idx: number) => ({
                    id: idx + 1,
                    text: q,
                    expectedKeywords: skillsData.skills
                        .slice(idx * 2, idx * 2 + 3)  // Assign 2-3 skills per question
                        .map((s: Skill) => s.skill)
                }));

                setQuestions(formattedQuestions);
                setInterviewState('ready');

                console.log('[AIInterviewRoom] ✅ Interview ready with', formattedQuestions.length, 'questions');
                console.log('[AIInterviewRoom] ========================================');

            } catch (err) {
                console.error('[AIInterviewRoom] ❌ Initialization error:', err);
                setSetupError(err instanceof Error ? err.message : 'Failed to initialize interview');
                setInterviewState('error');
            }
        };

        initializeInterview();
    }, [jobDescription, jobTitle]);

    // ===========================
    // TEXT-TO-SPEECH: Read Question Aloud
    // ===========================
    const speakQuestion = (questionText: string) => {
        setSpeechError(false);
        
        if (!('speechSynthesis' in window)) {
            console.error('[AIInterviewRoom] Speech synthesis not supported');
            setSpeechError(true);
            return;
        }

        console.log("[AIInterviewRoom] 🔊 Starting speech synthesis...");

        if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
        }

        setIsReading(true);
        window.speechSynthesis.cancel();

        const voices = window.speechSynthesis.getVoices();
        const englishVoice = 
            voices.find(v => v.lang.startsWith("en")) || 
            voices.find(v => v.lang.includes("US")) ||
            voices[0];
        
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(questionText);
            utterance.voice = englishVoice;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            let hasEnded = false;
            
            utterance.onend = () => {
                if (hasEnded) return;
                hasEnded = true;
                
                console.log('[AIInterviewRoom] Speech synthesis ended successfully');
                setIsReading(false);
                
                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }
            };
            
            utterance.onerror = (event) => {
                if (hasEnded) return;
                hasEnded = true;
                
                console.error('[AIInterviewRoom] Speech synthesis error:', event.error);
                setIsReading(false);
                
                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }
                
                if (event.error !== 'canceled') {
                    setSpeechError(true);
                }
            };
            
            synthRef.current = utterance;
            
            fallbackTimeoutRef.current = setTimeout(() => {
                if (isReading && !hasEnded) {
                    console.log('[AIInterviewRoom] Speech timeout - stopping speech');
                    hasEnded = true;
                    window.speechSynthesis.cancel();
                    setIsReading(false);
                    setSpeechError(true);
                }
            }, 5000);
            
            try {
                window.speechSynthesis.speak(utterance);
            } catch (error) {
                console.error('[AIInterviewRoom] Failed to start speech:', error);
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

    // ===========================
    // RECORDING: Capture User's Answer
    // ===========================
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
                console.log("[AIInterviewRoom] AudioBlob created:", audioBlob.size, "bytes");
                await analyzeResponse(audioBlob);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('[AIInterviewRoom] Microphone access error:', error);
            alert('Please allow microphone access to continue the interview.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
        if (audioStream.current) {
            audioStream.current.getTracks().forEach(track => track.stop());
        }
    };

    // ===========================
    // ANALYSIS: Send to Backend for Grading
    // ===========================
    const analyzeResponse = async (audioBlob: Blob) => {
        setIsAnalyzing(true);
        setCurrentTranscript('');
        setAnalysisResult(null);

        try {
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'response.webm');
            formData.append('question', currentQuestion.text);

            if (currentQuestion.expectedKeywords && currentQuestion.expectedKeywords.length > 0) {
                formData.append('expected_keywords', currentQuestion.expectedKeywords.join(','));
            }
            
            console.log('[AIInterviewRoom] Sending to backend:', {
                question: currentQuestion.text,
                keywords: currentQuestion.expectedKeywords,
                audioBlobSize: audioBlob.size
            });

            const response = await fetch(`${API_BASE_URL}/interview-room/transcribe-and-analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to analyze response');
            }

            const data = await response.json();
            
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
            setAllResults(prev => [...prev, result]);

        } catch (error) {
            console.error('[AIInterviewRoom] Analysis error:', error);
            alert('Failed to analyze your response. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ===========================
    // NAVIGATION: Move Between Questions
    // ===========================
    const handleNextQuestion = () => {
        setShowResult(false);
        setCurrentTranscript('');
        setAnalysisResult(null);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            onComplete(allResults);
        }
    };

    const handleRetry = () => {
        setShowResult(false);
        setCurrentTranscript('');
        setAnalysisResult(null);
        speakQuestion(currentQuestion.text);
    };

    // Auto-read question when it changes
    useEffect(() => {
        if (currentQuestion && !showResult && interviewState === 'ready') {
            const timer = setTimeout(() => {
                speakQuestion(currentQuestion.text);
            }, 500);
            
            return () => clearTimeout(timer);
        }
    }, [currentQuestionIndex, interviewState]);

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

    // ===========================
    // RENDER: UI States
    // ===========================

    if (interviewState === 'initializing') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Preparing Your Interview...</h2>
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
                    <p className="text-gray-600 mb-2">Analyzing job requirements</p>
                    <p className="text-sm text-gray-500">Generating personalized questions based on the job description</p>
                </div>
            </div>
        );
    }

    if (interviewState === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Setup Error</h2>
                    <p className="text-gray-700 mb-6">{setupError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-4 text-center">
                    <h1 className="text-5xl font-bold text-gray-800 mt-10">{jobTitle}</h1>
                    <p className="text-2xl text-gray-600">AI-Powered Interview</p>
                </div>

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
                        <button 
                            onClick={goHome}
                            className='flex items-center justify-center bg-blue-600 w-fit p-3 mb-5 ml-0.5 rounded-4xl text-white gap-3'>
                            <House className='w-6 h-6 text-white'/>
                            Home
                        </button>
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
                                    <p className="text-sm text-gray-600 mb-4">Get ready to record your answer</p>
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
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-blue-600">📝</span>
                                    Your Response:
                                </h3>
                                <p className="text-gray-700 italic">"{currentTranscript}"</p>
                            </div>

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