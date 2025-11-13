import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, ArrowRight, FileText } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface ResumeQuestion {
    id: string;
    text: string;
    category: string;
    required: boolean;
}

interface ResumeResponse {
    questionId: string;
    question: string;
    answer: string;
    category: string;
}

interface ResumeQuestionRoomProps {
    onComplete: (responses: ResumeResponse[]) => void;
}

const ResumeQuestionRoom: React.FC<ResumeQuestionRoomProps> = ({ onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isReading, setIsReading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [allResponses, setAllResponses] = useState<ResumeResponse[]>([]);
    const [showTranscript, setShowTranscript] = useState(false);
    const [speechError, setSpeechError] = useState(false);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const audioStream = useRef<MediaStream | null>(null);
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // TEST MODE: Set to true to use only 3 questions for quick testing
    const TEST_MODE = false;

    // TEST QUESTIONS (3 questions for quick testing)
    const testQuestions: ResumeQuestion[] = [
        { id: 'Q1', text: 'What is your full name?', category: 'contact', required: true },
        { id: 'Q2', text: 'What job title or trade best describes you?', category: 'contact', required: true },
        { id: 'Q3', text: 'What is your phone number?', category: 'contact', required: true },
    ];

    // FULL RESUME QUESTIONS - All questions from resume_data_collection_guide.txt
    const fullQuestions: ResumeQuestion[] = [
        // SECTION 1: CONTACT INFORMATION (Q1-Q5)
        { id: 'Q1', text: 'What is your full name? Please provide your first and last name.', category: 'contact', required: true },
        { id: 'Q2', text: 'What job title or trade best describes you? For example: Electrician, Welder, Warehouse Worker, CDL Driver, or Mechanic.', category: 'contact', required: true },
        { id: 'Q3', text: 'What is your phone number? The best number to reach you.', category: 'contact', required: true },
        { id: 'Q4', text: 'What is your email address? Use a professional email. If you don\'t have one, just say "None".', category: 'contact', required: false },
        { id: 'Q5', text: 'What city and state do you live in? For example: El Paso, Texas.', category: 'contact', required: true },

        // SECTION 2: WORK EXPERIENCE - JOB 1 (Q6-Q14)
        { id: 'Q6', text: 'What is the name of your current or most recent employer?', category: 'work_job1', required: true },
        { id: 'Q7', text: 'What city and state was this job located in?', category: 'work_job1', required: true },
        { id: 'Q8', text: 'What was your job title at this company?', category: 'work_job1', required: true },
        { id: 'Q9', text: 'When did you start this job? Please give me the month and year.', category: 'work_job1', required: true },
        { id: 'Q10', text: 'When did this job end? Say the month and year, or say "Present" if you still work there.', category: 'work_job1', required: true },
        { id: 'Q11', text: 'Tell me about your first accomplishment at this job. What equipment did you operate? How much or how often? Did you improve safety, speed, or quality? Include numbers if possible.', category: 'work_job1', required: true },
        { id: 'Q12', text: 'What was your second accomplishment at this job? Think about people you trained, awards you received, or additional responsibilities.', category: 'work_job1', required: true },
        { id: 'Q13', text: 'Tell me about your third accomplishment. Maybe something related to your daily production, workload, or teamwork.', category: 'work_job1', required: true },
        { id: 'Q14', text: 'Do you have a fourth accomplishment to share from this job? If not, just say "No".', category: 'work_job1', required: false },

        // SECTION 2: WORK EXPERIENCE - JOB 2 (Q15-Q21)
        { id: 'Q15', text: 'Do you have a previous job to include? If yes, what was the company name? If no, just say "No".', category: 'work_job2', required: false },
        { id: 'Q16', text: 'What city and state was this second job located in?', category: 'work_job2', required: false },
        { id: 'Q17', text: 'What was your job title at this company?', category: 'work_job2', required: false },
        { id: 'Q18', text: 'When did you start this job? Month and year, please.', category: 'work_job2', required: false },
        { id: 'Q19', text: 'When did you leave this job? Month and year.', category: 'work_job2', required: false },
        { id: 'Q20', text: 'What was your first accomplishment at this job? Remember to include numbers and specific results.', category: 'work_job2', required: false },
        { id: 'Q21', text: 'What was your second accomplishment at this job?', category: 'work_job2', required: false },
        { id: 'Q22', text: 'Do you have a third accomplishment from this job? If not, just say "No".', category: 'work_job2', required: false },

        // SECTION 3: SKILLS (Q30-Q32)
        { id: 'Q30', text: 'List all your technical skills. What tools, equipment, and machinery can you operate? For example: forklifts, welding equipment, power tools, heavy equipment, hand tools, vehicles, manufacturing equipment, construction tools. Be as specific as possible.', category: 'skills', required: true },
        { id: 'Q31', text: 'What certifications and licenses do you currently have? For example: CDL with endorsements, forklift certification, OSHA 10-hour or 30-hour card, trade licenses, equipment certifications, EPA certification, First Aid CPR, or other safety certifications.', category: 'skills', required: true },
        { id: 'Q32', text: 'What are your core competencies and soft skills? For example: safety compliance, quality control, team leadership, time management, problem-solving, physical stamina, blueprint reading, inventory management, customer service, reliable attendance, or being punctual.', category: 'skills', required: true },

        // SECTION 4: EDUCATION (Q34-Q37)
        { id: 'Q34', text: 'What is the name of your high school, trade school, or college?', category: 'education', required: true },
        { id: 'Q35', text: 'What city and state is this school located in?', category: 'education', required: true },
        { id: 'Q36', text: 'What did you earn at this school? For example: High School Diploma, GED, Certificate in a trade, Associate Degree, or Bachelor\'s Degree.', category: 'education', required: true },
        { id: 'Q37', text: 'When did you graduate or complete this program? Give me the month and year, or say "Present" if you\'re still attending.', category: 'education', required: true },

        // SECTION 5: TRAINING & CERTIFICATIONS DETAILED (Q39-Q41)
        { id: 'Q39', text: 'Let\'s go through your certifications in detail. What is the full name of your first or most important certification or training? If you don\'t have any, say "None".', category: 'certifications', required: false },
        { id: 'Q40', text: 'What organization issued this certification? For example: OSHA, NCCER, Red Cross, a union, or another organization.', category: 'certifications', required: false },
        { id: 'Q41', text: 'When did you receive this certification? Or if it has an expiration date, when does it expire?', category: 'certifications', required: false },
    ];

    // Use test questions if TEST_MODE is true, otherwise use full questions
    const questions = TEST_MODE ? testQuestions : fullQuestions;

    const currentQuestion = questions[currentQuestionIndex];

    // Text-to-Speech: Read question aloud
    const speakQuestion = (questionText: string) => {
        setSpeechError(false);

        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            setSpeechError(true);
            return;
        }

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

                console.log('Speech synthesis ended successfully');
                setIsReading(false);

                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }
            };

            utterance.onerror = (event) => {
                if (hasEnded) return;
                hasEnded = true;

                console.error('Speech synthesis error:', event.error);
                setIsReading(false);

                if (fallbackTimeoutRef.current) {
                    clearTimeout(fallbackTimeoutRef.current);
                    fallbackTimeoutRef.current = null;
                }

                if (event.error !== 'canceled') {
                    setSpeechError(true);
                }
            };

            fallbackTimeoutRef.current = setTimeout(() => {
                if (isReading && !hasEnded) {
                    console.log('Speech timeout - stopping speech');
                    hasEnded = true;
                    window.speechSynthesis.cancel();
                    setIsReading(false);
                    setSpeechError(true);
                }
            }, 8000);

            try {
                window.speechSynthesis.speak(utterance);
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
                await transcribeAudio(audioBlob);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Microphone access error:', error);
            alert('Please allow microphone access to continue.');
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

    // Transcribe the recorded audio
    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true);
        setCurrentTranscript('');

        try {
            // Step 1: Transcribe audio with Whisper
            const formData = new FormData();
            formData.append('audio_file', audioBlob, 'response.webm');

            const transcribeResponse = await fetch(`${API_BASE_URL}/resume/transcribe`, {
                method: 'POST',
                body: formData,
            });

            if (!transcribeResponse.ok) {
                throw new Error('Failed to transcribe audio');
            }

            const transcribeData = await transcribeResponse.json();
            const rawTranscript = transcribeData.transcript || '';

            console.log(`[Q${currentQuestionIndex + 1}/${questions.length}] ${currentQuestion.id} (raw):`, rawTranscript);

            // Step 2: Validate and clean the response with AI
            const validateResponse = await fetch(`${API_BASE_URL}/resume/validate-response`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: currentQuestion.text,
                    answer: rawTranscript,
                    question_id: currentQuestion.id,
                }),
            });

            if (!validateResponse.ok) {
                throw new Error('Failed to validate response');
            }

            const validateData = await validateResponse.json();
            const validatedAnswer = validateData.validated_answer || rawTranscript;
            const isValid = validateData.is_valid;

            console.log(`[Q${currentQuestionIndex + 1}/${questions.length}] ${currentQuestion.id} (validated):`, validatedAnswer);

            // Show validation warning if answer is invalid
            if (!isValid && validateData.suggestion) {
                alert(validateData.suggestion);
            }

            // Use validated answer
            setCurrentTranscript(validatedAnswer);
            setShowTranscript(true);

            // Save validated response
            const newResponse: ResumeResponse = {
                questionId: currentQuestion.id,
                question: currentQuestion.text,
                answer: validatedAnswer,
                category: currentQuestion.category,
            };

            setAllResponses(prev => [...prev, newResponse]);

        } catch (error) {
            console.error('Transcription/validation error:', error);
            alert('Failed to process your response. Please try again.');
        } finally {
            setIsTranscribing(false);
        }
    };

    // Move to next question
    const handleNextQuestion = () => {
        setShowTranscript(false);
        setCurrentTranscript('');

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Interview complete
            console.log('==================== INTERVIEW COMPLETE ====================');
            console.log('Total responses collected:', allResponses.length);
            console.log('All responses:', allResponses);
            console.log('===========================================================');
            onComplete(allResponses);
        }
    };

    // Retry current question
    const handleRetry = () => {
        setShowTranscript(false);
        setCurrentTranscript('');
        speakQuestion(currentQuestion.text);
    };

    // Skip question
    const handleSkip = () => {
        if (!currentQuestion.required) {
            console.log(`[Q${currentQuestionIndex + 1}/${questions.length}] ${currentQuestion.id}: SKIPPED`);

            const newResponse: ResumeResponse = {
                questionId: currentQuestion.id,
                question: currentQuestion.text,
                answer: "No",
                category: currentQuestion.category,
            };

            setAllResponses(prev => [...prev, newResponse]);
            handleNextQuestion();
        }
    };

    // Auto-read question when it changes
    useEffect(() => {
        if (currentQuestion && !showTranscript) {
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Category Badge */}
                <div className="mb-4">
                    <span className="inline-block px-4 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        {currentQuestion.category.replace('_', ' ').toUpperCase()}
                    </span>
                </div>

                {/* Main Question Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Question Display */}
                    <div className="mb-8">
                        <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                                isReading ? 'bg-green-600 animate-pulse' : 'bg-gray-200'
                            }`}>
                                <Volume2 className={`w-6 h-6 ${isReading ? 'text-white' : 'text-gray-600'}`} />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                    {currentQuestion.text}
                                </h2>
                                {isReading && (
                                    <p className="text-sm text-green-600 animate-pulse">
                                        Reading question aloud...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recording Status */}
                    {!showTranscript && (
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
                            ) : isTranscribing ? (
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4" />
                                    <p className="text-lg font-semibold text-gray-800">Processing your response...</p>
                                    <p className="text-sm text-gray-600">Please wait</p>
                                </div>
                            ) : isReading ? (
                                <div className="text-center">
                                    <div className="inline-block animate-pulse mb-4">
                                        <Volume2 className="w-16 h-16 text-green-600" />
                                    </div>
                                    <p className="text-lg font-semibold text-gray-800 mb-2">Reading question...</p>
                                    <p className="text-sm text-gray-600 mb-4">Wait or click to skip</p>
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
                                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
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
                                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <Mic className="inline w-5 h-5 mr-2" />
                                        Start Recording
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-gray-600 mb-4">Ready to answer?</p>
                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={() => startRecording()}
                                            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            <Mic className="inline w-5 h-5 mr-2" />
                                            Start Recording
                                        </button>
                                        {!currentQuestion.required && (
                                            <button
                                                onClick={handleSkip}
                                                className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                                            >
                                                Skip (Optional)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transcript Display */}
                    {showTranscript && (
                        <div className="space-y-6">
                            {/* Transcript */}
                            <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-green-600">📝</span>
                                    Your Response:
                                </h3>
                                <p className="text-gray-700 italic">"{currentTranscript}"</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleRetry}
                                    className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                                >
                                    Re-record Answer
                                </button>
                                <button
                                    onClick={handleNextQuestion}
                                    className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {currentQuestionIndex < questions.length - 1 ? (
                                        <>Next Question <ArrowRight className="w-5 h-5" /></>
                                    ) : (
                                        <>Complete <FileText className="w-5 h-5" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress Summary */}
                {allResponses.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">Progress Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-green-600">{allResponses.length}</div>
                                <div className="text-sm text-gray-600">Questions Answered</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {questions.length - allResponses.length}
                                </div>
                                <div className="text-sm text-gray-600">Remaining</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumeQuestionRoom;
