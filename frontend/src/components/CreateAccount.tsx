import React, { useState, useEffect, useRef } from 'react';
import './CreateAccount.css';

interface CreateAccountProps {
  setCreatingAccount: (value: boolean) => void;
}

const CreateAccount: React.FC<CreateAccountProps> = ({ setCreatingAccount }) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<string[]>([]);
  const [allResponses, setAllResponses] = useState<Record<string, string> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [hasRecordedAnswer, setHasRecordedAnswer] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptPassword, setPromptPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textAnswer, setTextAnswer] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userIdRef = useRef<string>(Math.random().toString(36).substring(7));

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/questions');
        const data = await response.json();
        setQuestions(data.questions);
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      if (inputMode === 'voice') {
        speakQuestion(questions[currentQuestionIndex]);
      }
      setRecordedAudioUrl(null);
      setTranscribedText(null);
      setHasRecordedAnswer(false);
      setAllResponses(null);
    }
  }, [questions, currentQuestionIndex, inputMode]);

  const speakQuestion = (question: string) => {
    const utterance = new SpeechSynthesisUtterance(question);
    utterance.onend = () => {
      startRecording();
    };
    speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setRecordedAudioUrl(null);
      setHasRecordedAnswer(false);
      setTranscribedText(null);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        setHasRecordedAnswer(true);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleNextQuestion = async () => {
    if (recordedAudioUrl) {
      setIsProcessing(true);
      const audioBlob = await fetch(recordedAudioUrl).then(res => res.blob());
      await sendAudioToBackend(audioBlob);
      setHasRecordedAnswer(false);
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (textAnswer) {
      setIsProcessing(true);
      await sendTextToBackend(textAnswer);
      setTextAnswer('');
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setRecordedAudioUrl(null);
    setTranscribedText(null);
    setHasRecordedAnswer(false);
    startRecording();
  };

  const sendTextToBackend = async (text: string) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/text-input/${userIdRef.current}/${currentQuestionIndex}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        }
      );
      const data = await response.json();
      if (data.next_question_id !== undefined) {
        setCurrentQuestionIndex(data.next_question_id);
      } else {
        setAllResponses(data.responses);
        if (data.prompt_password) {
          setPromptPassword(true);
        }
      }
    } catch (error) {
      console.error('Error sending text to backend:', error);
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'response.wav');

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/voice-input/${userIdRef.current}/${currentQuestionIndex}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json();
      setTranscribedText(data.transcribed_text);
      setResponses((prev) => [...prev, data.message]);

      if (data.next_question_id !== undefined) {
        setCurrentQuestionIndex(data.next_question_id);
      } else {
        setAllResponses(data.responses);
        if (data.prompt_password) {
          setPromptPassword(true);
        }
      }
    } catch (error) {
      console.error('Error sending audio to backend:', error);
    }
  };

  const handlePasswordSave = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/create-password/${userIdRef.current}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password })
        }
      );
      const data = await response.json();
      if (data.message) {
        setPasswordSaved(true);
      }
    } catch (error) {
      console.error('Error saving password:', error);
    }
  };

  return (
    <div className="create-account-container">
      <div className="form-card">
        <h1>Create Your Account</h1>
        {questions.length > 0 && currentQuestionIndex < questions.length && !allResponses ? (
          <div className="question-container">
            <p className="question-text">Question {currentQuestionIndex + 1}: {questions[currentQuestionIndex]}</p>
            <div className="input-mode-selector">
              <button onClick={() => setInputMode('voice')} className={inputMode === 'voice' ? 'active' : ''}>Voice</button>
              <button onClick={() => setInputMode('text')} className={inputMode === 'text' ? 'active' : ''}>Text</button>
            </div>

            {inputMode === 'voice' ? (
              <>
                <div className="recording-controls">
                  {!isRecording && !hasRecordedAnswer && (
                    <button onClick={startRecording}>Start Recording</button>
                  )}
                  {isRecording && (
                    <button className="stop" onClick={stopRecording}>Stop Recording</button>
                  )}
                </div>

                {recordedAudioUrl && (
                  <div className="audio-playback">
                    <p>Your recording:</p>
                    <audio controls src={recordedAudioUrl}></audio>
                    {transcribedText && (
                      <p className="transcribed-text"><b>Transcribed:</b> {transcribedText}</p>
                    )}
                  </div>
                )}

                <div className="button-group">
                  {hasRecordedAnswer && (
                    <>
                      <button onClick={handleNextQuestion} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Next Question'}
                      </button>
                      <button className="retry" onClick={handleRetry} disabled={isProcessing}>Retry</button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-input-container">
                <textarea value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} placeholder="Type your answer here..." />
                <button onClick={handleTextSubmit} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        ) : allResponses ? (
          <div className="completion-screen">
            <h2>Account Creation Complete!</h2>
            <h3>Your Responses:</h3>
            <div className="responses-grid">
              {Object.entries(allResponses).map(([question, answer]) => (
                <div key={question} className="response-item">
                  <strong>{question}</strong>
                  <p>{answer}</p>
                </div>
              ))}
            </div>
            {promptPassword && !passwordSaved && (
              <div className="password-creation">
                <h3>Create a Password</h3>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
                <button onClick={handlePasswordSave}>Save Password</button>
              </div>
            )}
            {passwordSaved && (
              <p>Your account has been created successfully!</p>
            )}
            <button className="back-to-home-btn" onClick={() => setCreatingAccount(false)}>Back to Home</button>
          </div>
        ) : (
          <p>Loading questions or all questions answered...</p>
        )}
        {!allResponses && <button className="back-button" onClick={() => setCreatingAccount(false)}>Back to Home</button>}
      </div>
    </div>
  );
};

export default CreateAccount;
