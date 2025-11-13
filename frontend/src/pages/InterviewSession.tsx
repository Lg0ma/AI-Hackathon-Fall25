import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface Job {
  title: string;
  description: string;
}

interface Skill {
  skill: string;
  category: string;
}

type InterviewState = 'loading' | 'ready' | 'showing_question' | 'recording' | 'processing' | 'completed' | 'error';

function InterviewSession() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Job and interview data
  const [job, setJob] = useState<Job | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);

  // Interview progress
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // State management
  const [interviewState, setInterviewState] = useState<InterviewState>('loading');
  const [error, setError] = useState<string | null>(null);

  // Real-time data
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [detectedSkillsList, setDetectedSkillsList] = useState<string[]>([]);
  const [progressDetected, setProgressDetected] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Final report
  const [finalReport, setFinalReport] = useState<any>(null);

  // MediaRecorder refs
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrame = useRef<number | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  // Initialize interview - Extract skills and questions ONCE
  useEffect(() => {
    const initializeInterview = async () => {
      console.log('[InterviewSession] Initializing for job:', jobId);
      try {
        let jobData = location.state?.job;
        if (!jobData && jobId) {
          const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
          if (!response.ok) throw new Error('Failed to fetch job details');
          jobData = await response.json();
        }
        if (!jobData) throw new Error('No job data available');
        setJob(jobData);
        console.log('[InterviewSession] Job loaded:', jobData.title);

        // Extract skills (ONCE)
        console.log('[InterviewSession] Extracting skills...');
        const skillsResponse = await fetch(`${API_BASE_URL}/ai/extract-skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: jobData.description }),
        });
        if (!skillsResponse.ok) throw new Error('Failed to extract skills');
        const skillsData = await skillsResponse.json();
        setSkills(skillsData.skills);
        setProgressTotal(skillsData.skills.length);
        console.log('[InterviewSession] ✅ Skills extracted:', skillsData.skills.length);

        // Generate questions (ONCE)
        console.log('[InterviewSession] Generating questions...');
        const questionsResponse = await fetch(`${API_BASE_URL}/ai/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills: skillsData.skills, max_questions: 8 }),
        });
        if (!questionsResponse.ok) throw new Error('Failed to generate questions');
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.questions);
        console.log('[InterviewSession] ✅ Questions generated:', questionsData.questions.length);

        setInterviewState('ready');
      } catch (err) {
        console.error('[InterviewSession] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during setup.');
        setInterviewState('error');
      }
    };

    initializeInterview();
  }, [jobId, location.state]);

  const startInterview = async () => {
    console.log('[InterviewSession] ========================================');
    console.log('[InterviewSession] STARTING INTERVIEW');
    console.log('[InterviewSession] ========================================');
    console.log(`[InterviewSession] Skills count: ${skills.length}`);
    console.log(`[InterviewSession] Questions count: ${questions.length}`);
    console.log('[InterviewSession] Skills:', skills);
    console.log('[InterviewSession] Questions:', questions);

    setInterviewState('processing');
    setError(null);
    setDetectedSkillsList([]);
    setProgressDetected(0);
    setProgressPercentage(0);

    try {
      // Call /interview/start to create session
      const url = `${API_BASE_URL}/interview/start`;
      const payload = { skills, questions };

      console.log(`[InterviewSession] URL: ${url}`);
      console.log('[InterviewSession] Payload:', JSON.stringify(payload, null, 2));
      console.log('[InterviewSession] Sending request...');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log(`[InterviewSession] Response received: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[InterviewSession] ❌ Server error response:`, errorText);
        throw new Error(`Failed to start interview session: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[InterviewSession] ✅ Session created successfully');
      console.log('[InterviewSession] Session data:', JSON.stringify(data, null, 2));

      setSessionId(data.session_id);
      setTotalQuestions(data.total_questions);

      console.log(`[InterviewSession] Session ID: ${data.session_id}`);
      console.log(`[InterviewSession] Total questions: ${data.total_questions}`);

      // Show first question
      setCurrentQuestionIndex(0);
      setCurrentQuestion(questions[0]);
      setInterviewState('showing_question');

      console.log('[InterviewSession] First question ready:', questions[0]);
      console.log('[InterviewSession] ========================================');

    } catch (err) {
      console.error('[InterviewSession] ========================================');
      console.error('[InterviewSession] ❌ ERROR STARTING INTERVIEW');
      console.error('[InterviewSession] ========================================');
      console.error('[InterviewSession] Error object:', err);
      console.error('[InterviewSession] Error message:', err instanceof Error ? err.message : String(err));
      console.error('[InterviewSession] ========================================');

      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setInterviewState('error');
    }
  };

  const startRecordingAnswer = async () => {
    console.log('[InterviewSession] 🎤 Starting recording...');
    console.log(`[InterviewSession] Current session ID: ${sessionId}`);
    console.log(`[InterviewSession] Current question index: ${currentQuestionIndex}`);
    setInterviewState('recording');
    audioChunks.current = [];

    try {
      // Get microphone access
      console.log('[InterviewSession] Requesting microphone access...');
      audioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[InterviewSession] ✅ Microphone access granted');

      // Setup audio visualizer
      setupAudioVisualizer(audioStream.current);

      // Setup recorder with proper MIME type
      // Try audio/webm first, fall back to browser default if not supported
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`[InterviewSession] ${mimeType} not supported, using browser default`);
        mimeType = ''; // Use browser default
      }

      console.log(`[InterviewSession] Setting up MediaRecorder with mimeType: ${mimeType || 'browser default'}`);
      mediaRecorder.current = new MediaRecorder(audioStream.current,
        mimeType ? { mimeType: mimeType } : {}
      );

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`[InterviewSession] Audio data chunk received: ${event.data.size} bytes`);
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        console.log('[InterviewSession] ⏹ Recording stopped');
        console.log(`[InterviewSession] Total audio chunks collected: ${audioChunks.current.length}`);
        setInterviewState('processing');

        // Stop visualizer
        stopAudioVisualizer();

        // Create audio blob with correct MIME type matching MediaRecorder
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        console.log(`[InterviewSession] Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

        // Send to backend
        await submitAnswer(audioBlob);
      };

      // Start recording
      mediaRecorder.current.start();
      console.log('[InterviewSession] ✅ Recording started successfully');

    } catch (err) {
      console.error('[InterviewSession] ❌ Microphone error:', err);
      console.error('[InterviewSession] Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      setError('Microphone access denied. Please enable microphone permissions.');
      setInterviewState('showing_question');
    }
  };

  const stopRecordingAnswer = () => {
    console.log('[InterviewSession] Stopping recording...');
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
    stopRecordingAudio();
  };

  const submitAnswer = async (audioBlob: Blob) => {
    console.log('[InterviewSession] ========================================');
    console.log('[InterviewSession] SUBMITTING ANSWER');
    console.log('[InterviewSession] ========================================');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'answer.webm');

      console.log(`[InterviewSession] 📤 Submitting answer for Q${currentQuestionIndex + 1}...`);
      console.log(`[InterviewSession]    Session ID: ${sessionId}`);
      console.log(`[InterviewSession]    Question Index: ${currentQuestionIndex}`);
      console.log(`[InterviewSession]    Audio size: ${audioBlob.size} bytes`);
      console.log(`[InterviewSession]    Audio type: ${audioBlob.type}`);

      const url = `${API_BASE_URL}/interview/answer/${sessionId}/${currentQuestionIndex}`;
      console.log(`[InterviewSession]    URL: ${url}`);

      // Post to /interview/answer/{session_id}/{question_index}
      console.log('[InterviewSession] Sending fetch request...');
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      console.log(`[InterviewSession] 📥 Response received: ${response.status} ${response.statusText}`);
      console.log(`[InterviewSession]    Response OK: ${response.ok}`);
      console.log(`[InterviewSession]    Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[InterviewSession] ❌ Server error response:`, errorText);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[InterviewSession] ✅ Answer processed successfully');
      console.log('[InterviewSession] Response data:', JSON.stringify(result, null, 2));

      // Update UI with transcript and detected skills
      console.log('[InterviewSession] Updating UI with results...');
      console.log(`[InterviewSession]    Transcript: "${result.transcript}"`);
      console.log(`[InterviewSession]    Detected skills: [${result.detected_skills?.join(', ') || 'none'}]`);
      console.log(`[InterviewSession]    Progress: ${result.progress?.detected}/${result.progress?.total} (${result.progress?.percentage}%)`);

      setCurrentTranscript(result.transcript);
      setDetectedSkillsList(result.detected_skills || []);
      setProgressDetected(result.progress.detected);
      setProgressTotal(result.progress.total);
      setProgressPercentage(result.progress.percentage);

      console.log('[InterviewSession] ✅ UI state updated');

      // Check if all skills detected
      if (result.all_skills_detected) {
        console.log('[InterviewSession] 🎉 All skills detected! Completing interview...');
        await completeInterview();
        return;
      }

      // Check if there's a next question
      if (result.has_next_question && result.next_question_index !== null) {
        const nextIndex = result.next_question_index;
        console.log(`[InterviewSession] ➡️  Moving to Q${nextIndex + 1}`);
        console.log(`[InterviewSession]    Question: "${questions[nextIndex]}"`);
        setCurrentQuestionIndex(nextIndex);
        setCurrentQuestion(questions[nextIndex]);
        setInterviewState('showing_question');
      } else {
        // All questions answered
        console.log('[InterviewSession] All questions answered. Completing interview...');
        await completeInterview();
      }

      console.log('[InterviewSession] ========================================');

    } catch (err) {
      console.error('[InterviewSession] ========================================');
      console.error('[InterviewSession] ❌ ERROR SUBMITTING ANSWER');
      console.error('[InterviewSession] ========================================');
      console.error('[InterviewSession] Error object:', err);
      console.error('[InterviewSession] Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('[InterviewSession] Error message:', err instanceof Error ? err.message : String(err));
      console.error('[InterviewSession] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      console.error('[InterviewSession] ========================================');

      const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(errorMessage);
      setInterviewState('error');
    }
  };

  const completeInterview = async () => {
    console.log('[InterviewSession] ========================================');
    console.log('[InterviewSession] COMPLETING INTERVIEW');
    console.log('[InterviewSession] ========================================');

    try {
      const url = `${API_BASE_URL}/interview/complete/${sessionId}`;
      console.log(`[InterviewSession] URL: ${url}`);
      console.log('[InterviewSession] Sending completion request...');

      const response = await fetch(url, { method: 'POST' });

      console.log(`[InterviewSession] Response received: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[InterviewSession] ❌ Server error response:`, errorText);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const finalData = await response.json();
      console.log('[InterviewSession] ✅ Interview completed successfully');
      console.log('[InterviewSession] Final report:', JSON.stringify(finalData, null, 2));

      setFinalReport(finalData);
      setInterviewState('completed');
      stopRecordingAudio();

      console.log('[InterviewSession] ========================================');

    } catch (err) {
      console.error('[InterviewSession] ========================================');
      console.error('[InterviewSession] ❌ ERROR COMPLETING INTERVIEW');
      console.error('[InterviewSession] ========================================');
      console.error('[InterviewSession] Error object:', err);
      console.error('[InterviewSession] Error message:', err instanceof Error ? err.message : String(err));
      console.error('[InterviewSession] ========================================');

      setError(err instanceof Error ? err.message : 'Failed to complete interview');
      setInterviewState('error');
    }
  };

  const stopRecordingAudio = () => {
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }
    stopAudioVisualizer();
  };

  const setupAudioVisualizer = (stream: MediaStream) => {
    audioContext.current = new AudioContext();
    analyser.current = audioContext.current.createAnalyser();
    const microphone = audioContext.current.createMediaStreamSource(stream);

    microphone.connect(analyser.current);
    analyser.current.fftSize = 256;

    drawAudioVisualizer();
  };

  const drawAudioVisualizer = () => {
    if (!analyser.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrame.current = requestAnimationFrame(draw);

      analyser.current!.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = '#1f2937';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const red = barHeight + 100;
        const green = 50;
        const blue = 50;

        canvasCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const stopAudioVisualizer = () => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
  };

  const endInterview = async () => {
    console.log('[InterviewSession] Ending interview manually...');
    stopRecordingAudio();
    if (sessionId) {
      await completeInterview();
    } else {
      navigate('/home');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingAudio();
    };
  }, []);

  // Render components
  if (interviewState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Preparing Your Interview...</h1>
          <div className="mt-4 inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (interviewState === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">An Error Occurred</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="py-2 px-6 bg-blue-600 text-white rounded-lg">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (interviewState === 'completed') {
    const report = finalReport?.report;
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">🎉 Interview Complete!</h1>
          <div className="text-center mb-6">
            <p className="text-gray-600">Thank you for completing the interview for <strong>{job?.title}</strong>.</p>
          </div>
          {report && (
            <>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Skills Assessment</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{report.total_skills}</div>
                    <div className="text-sm text-gray-600">Required</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">{report.skills_has.length}</div>
                    <div className="text-sm text-gray-600">Demonstrated</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-500">{report.coverage.toFixed(0)}%</div>
                    <div className="text-sm text-gray-600">Coverage</div>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">✅ Skills You Demonstrated:</h3>
                <div className="flex flex-wrap gap-2">
                  {report.skills_has.map((s: any, i: number) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {s.skill} ({s.category})
                    </span>
                  ))}
                </div>
              </div>
              {report.skills_missing.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">❌ Skills Not Detected:</h3>
                  <div className="flex flex-wrap gap-2">
                    {report.skills_missing.map((s: any, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        {s.skill} ({s.category})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="text-center">
            <button onClick={() => navigate('/home')} className="py-3 px-8 bg-blue-600 text-white font-semibold rounded-lg shadow-md">
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b bg-blue-600 text-white">
          <h1 className="text-3xl font-bold">{job?.title}</h1>
          <p className="text-blue-100">AI-Powered Skills Interview</p>
        </div>

        {/* Progress Bar */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Skills Detected: {progressDetected} / {progressTotal}</span>
            <span>{progressPercentage.toFixed(0)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {interviewState === 'ready' ? (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Start?</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You'll be asked {questions.length} questions, one at a time.
              After each question, record your answer by clicking "Start Recording".
              The AI will analyze your responses in real-time.
            </p>
            <button
              onClick={startInterview}
              className="py-4 px-10 bg-blue-600 text-white text-lg font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
            >
              Start Interview
            </button>
          </div>
        ) : (
          <div className="p-8">
            {/* Current Question (ONE AT A TIME!) */}
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </div>
              <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  {currentQuestion || 'Loading next question...'}
                </h2>
              </div>
            </div>

            {/* Recording Controls */}
            {interviewState === 'showing_question' && (
              <div className="text-center mb-6">
                <button
                  onClick={startRecordingAnswer}
                  className="py-4 px-10 bg-red-600 text-white text-lg font-bold rounded-lg shadow-lg hover:bg-red-700 transition-colors"
                >
                  🎤 Start Recording Answer
                </button>
              </div>
            )}

            {interviewState === 'recording' && (
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="animate-pulse flex items-center space-x-3 text-red-600">
                    <div className="h-4 w-4 bg-red-600 rounded-full"></div>
                    <span className="text-xl font-bold">Recording...</span>
                  </div>
                </div>

                {/* Audio Visualizer */}
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={100}
                  className="w-full rounded-lg border-2 border-gray-300 mb-4"
                ></canvas>

                <div className="text-center">
                  <button
                    onClick={stopRecordingAnswer}
                    className="py-3 px-8 bg-gray-800 text-white font-bold rounded-lg shadow-md hover:bg-gray-900"
                  >
                    ⏹ Stop Recording
                  </button>
                </div>
              </div>
            )}

            {interviewState === 'processing' && (
              <div className="text-center mb-6">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-gray-600">Processing your answer...</p>
              </div>
            )}

            {/* Last Answer Transcript */}
            {currentTranscript && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-semibold text-gray-800 mb-2">Your Last Answer:</h3>
                <p className="text-gray-700 italic">"{currentTranscript}"</p>
                {detectedSkillsList.length > 0 && (
                  <div className="mt-3">
                    <span className="text-green-600 font-semibold">✅ Detected Skills: </span>
                    <span className="text-gray-700">{detectedSkillsList.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Debug Info (visible in development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-xs">
                <h3 className="font-semibold text-yellow-800 mb-2">Debug Info:</h3>
                <div className="text-yellow-900 space-y-1">
                  <div>Session ID: {sessionId || 'Not created'}</div>
                  <div>State: {interviewState}</div>
                  <div>Current Q Index: {currentQuestionIndex}</div>
                  <div>Total Questions: {totalQuestions}</div>
                  <div>Progress: {progressDetected}/{progressTotal} ({progressPercentage.toFixed(0)}%)</div>
                  <div>Current Transcript: {currentTranscript ? `"${currentTranscript.substring(0, 50)}..."` : 'None'}</div>
                  <div>Detected Skills: [{detectedSkillsList.join(', ')}]</div>
                </div>
              </div>
            )}

            {/* End Interview Button */}
            {sessionId && (
              <div className="text-center">
                <button
                  onClick={endInterview}
                  className="py-2 px-6 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                >
                  End Interview
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewSession;
