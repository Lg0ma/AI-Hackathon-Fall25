import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:8000';
const WEBSOCKET_URL = 'ws://127.0.0.1:8000/ws/interview';
const INTERVIEW_DURATION_SECONDS = 300; // 5 minutes

interface Job {
  title: string;
  description: string;
}

type InterviewState = 'loading' | 'ready' | 'recording' | 'completed' | 'error';

function InterviewSession() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Job and interview data
  const [job, setJob] = useState<Job | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);

  // State management
  const [interviewState, setInterviewState] = useState<InterviewState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(INTERVIEW_DURATION_SECONDS);

  // Real-time data
  const [liveTranscript, setLiveTranscript] = useState('');
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [newlyDetectedSkills, setNewlyDetectedSkills] = useState<string[]>([]);

  // WebSocket and MediaRecorder refs
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioStream = useRef<MediaStream | null>(null);

  // Initialize interview
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

        // Extract skills
        const skillsResponse = await fetch(`${API_BASE_URL}/ai/extract-skills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: jobData.description }),
        });
        if (!skillsResponse.ok) throw new Error('Failed to extract skills');
        const skillsData = await skillsResponse.json();
        const extractedSkills = skillsData.skills.map((s: any) => s.skill);
        setSkills(extractedSkills);
        console.log('[InterviewSession] Skills extracted:', extractedSkills.length);

        // Generate 8 questions
        const questionsResponse = await fetch(`${API_BASE_URL}/ai/generate-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills: extractedSkills, num_questions: 8 }),
        });
        if (!questionsResponse.ok) throw new Error('Failed to generate questions');
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData.questions);
        console.log('[InterviewSession] Questions generated:', questionsData.questions.length);

        setInterviewState('ready');
      } catch (err) {
        console.error('[InterviewSession] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during setup.');
        setInterviewState('error');
      }
    };

    initializeInterview();
  }, [jobId, location.state]);

  // Timer effect
  useEffect(() => {
    if (interviewState !== 'recording' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          stopInterview();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [interviewState]);

  const setupWebSocket = () => {
    if (!jobId) return;
    const url = `${WEBSOCKET_URL}/${jobId}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('[WebSocket] Connection opened');
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('[WebSocket] Message received:', message);

      if (message.type === 'transcript') {
        setLiveTranscript(prev => prev + ' ' + message.data);
      } else if (message.type === 'skill_detected') {
        setDetectedSkills(prev => {
          const newSkills = message.data.filter((s: string) => !prev.includes(s));
          if (newSkills.length > 0) {
            setNewlyDetectedSkills(newSkills);
            setTimeout(() => setNewlyDetectedSkills([]), 3000); // Animation duration
          }
          return [...new Set([...prev, ...message.data])];
        });
      } else if (message.type === 'error') {
        setError(message.message);
      }
    };

    ws.current.onclose = () => {
      console.log('[WebSocket] Connection closed');
    };

    ws.current.onerror = (err) => {
      console.error('[WebSocket] Error:', err);
      setError('WebSocket connection error. Please try again.');
      setInterviewState('error');
    };
  };

  const startInterview = async () => {
    console.log('[InterviewSession] Starting interview...');
    setInterviewState('recording');
    setLiveTranscript('');
    setDetectedSkills([]);
    setTimeLeft(INTERVIEW_DURATION_SECONDS);
    setError(null);

    setupWebSocket();

    try {
      audioStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(audioStream.current, { mimeType: 'audio/webm' });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(event.data);
        }
      };

      mediaRecorder.current.start(1000); // Send data every second
    } catch (err) {
      console.error('[InterviewSession] Microphone error:', err);
      setError('Microphone access denied. Please enable microphone permissions in your browser.');
      setInterviewState('error');
    }
  };

  const stopInterview = () => {
    console.log('[InterviewSession] Stopping interview...');
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
    }
    if (ws.current) {
      ws.current.close();
    }
    setInterviewState('completed');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

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
    const skillCoverage = skills.length > 0 ? (detectedSkills.length / skills.length) * 100 : 0;
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Interview Complete!</h1>
          <div className="text-center mb-6">
            <p className="text-gray-600">Thank you for completing the interview for <strong>{job?.title}</strong>.</p>
          </div>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Skills Assessment</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-3xl font-bold text-blue-600">{skills.length}</div><div className="text-sm text-gray-600">Required</div></div>
              <div><div className="text-3xl font-bold text-green-600">{detectedSkills.length}</div><div className="text-sm text-gray-600">Demonstrated</div></div>
              <div><div className="text-3xl font-bold text-orange-500">{skillCoverage.toFixed(0)}%</div><div className="text-sm text-gray-600">Coverage</div></div>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Skills You Demonstrated:</h3>
            <div className="flex flex-wrap gap-2">
              {detectedSkills.map((skill, i) => <span key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">{skill}</span>)}
            </div>
          </div>
          <div className="text-center">
            <button onClick={() => navigate('/')} className="py-3 px-8 bg-blue-600 text-white font-semibold rounded-lg shadow-md">
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900">{job?.title}</h1>
          <p className="text-gray-600">AI-Powered Skills Interview</p>
        </div>

        <div className="md:grid md:grid-cols-3">
          {/* Left Panel: Questions & Skills */}
          <div className="md:col-span-1 p-6 border-r">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Interview Questions</h2>
              <ul className="space-y-2 text-gray-700">
                {questions.map((q, i) => <li key={i} className="p-2 bg-gray-50 rounded-md"><strong>{i + 1}.</strong> {q}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Detected Skills ({detectedSkills.length})</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span key={i} className={`px-2 py-1 text-sm rounded-full ${detectedSkills.includes(skill) ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Recording & Transcript */}
          <div className="md:col-span-2 p-6">
            {interviewState === 'ready' ? (
              <div className="text-center flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Start?</h2>
                <p className="text-gray-600 mb-6 max-w-md">
                  When you're ready, click the button below to start the 5-minute interview.
                  Answer the questions on the left naturally. The AI will analyze your responses in real-time.
                </p>
                <button onClick={startInterview} className="py-3 px-8 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors">
                  Start Interview
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{formatTime(timeLeft)}</div>
                  <button onClick={stopInterview} className="py-2 px-6 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">
                    Stop Interview
                  </button>
                </div>

                <div className="h-64 p-4 bg-gray-50 rounded-lg border overflow-y-auto">
                  <p className="text-gray-800 whitespace-pre-wrap">{liveTranscript}</p>
                </div>

                {newlyDetectedSkills.length > 0 && (
                  <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg animate-pulse">
                    <p className="font-bold text-green-800">New Skill Detected!</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {newlyDetectedSkills.map((skill, i) => <span key={i} className="px-2 py-1 bg-green-200 text-sm rounded-full">{skill}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewSession;