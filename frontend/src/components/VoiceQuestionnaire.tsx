import React, { useState, useEffect, useRef } from 'react';

interface VoiceQuestionnaireProps {
  phoneNumber: string;
  onComplete: () => void;
}

const VoiceQuestionnaire: React.FC<VoiceQuestionnaireProps> = ({ phoneNumber, onComplete }) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [allResponses, setAllResponses] = useState<Record<string, string> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [hasRecordedAnswer, setHasRecordedAnswer] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textAnswer, setTextAnswer] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        `http://127.0.0.1:8000/text-input/${phoneNumber}/${currentQuestionIndex}`,
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
        `http://127.0.0.1:8000/voice-input/${phoneNumber}/${currentQuestionIndex}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = await response.json();
      setTranscribedText(data.transcribed_text);

      if (data.next_question_id !== undefined) {
        setCurrentQuestionIndex(data.next_question_id);
      } else {
        setAllResponses(data.responses);
      }
    } catch (error) {
      console.error('Error sending audio to backend:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-[90%] max-w-[600px] text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Tell us more about yourself</h1>
        {questions.length > 0 && currentQuestionIndex < questions.length && !allResponses ? (
          <div className="flex flex-col items-center">
            <p className="text-2xl text-gray-800 mb-6">
              Question {currentQuestionIndex + 1}: {questions[currentQuestionIndex]}
            </p>
            
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setInputMode('voice')}
                className={`mx-2 py-2 px-4 border rounded-full font-medium transition-all duration-200 ${
                  inputMode === 'voice'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-transparent border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                Voice
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`mx-2 py-2 px-4 border rounded-full font-medium transition-all duration-200 ${
                  inputMode === 'text'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-transparent border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                Text
              </button>
            </div>

            {inputMode === 'voice' ? (
              <>
                <div className="mb-6">
                  {!isRecording && !hasRecordedAnswer && (
                    <button
                      onClick={startRecording}
                      className="py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                      Start Recording
                    </button>
                  )}
                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="py-3 px-6 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-red-300"
                    >
                      Stop Recording
                    </button>
                  )}
                </div>

                {recordedAudioUrl && (
                  <div className="mb-6 w-full">
                    <p className="mb-2 font-medium text-gray-800">Your recording:</p>
                    <audio controls src={recordedAudioUrl} className="w-full"></audio>
                    {transcribedText && (
                      <p className="mt-4 italic text-gray-600">
                        <b>Transcribed:</b> {transcribedText}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-4 mb-6">
                  {hasRecordedAnswer && (
                    <>
                      <button
                        onClick={handleNextQuestion}
                        disabled={isProcessing}
                        className="py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing...' : 'Next Question'}
                      </button>
                      <button
                        onClick={handleRetry}
                        disabled={isProcessing}
                        className="py-3 px-6 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full max-w-[500px] min-h-[100px] p-3 border border-gray-300 rounded-lg text-base font-inherit focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={isProcessing}
                  className="w-full max-w-[500px] py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        ) : allResponses ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank you!</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Responses:</h3>
            <div className="grid grid-cols-1 gap-4 w-full mt-4 text-left">
              {Object.entries(allResponses).map(([question, answer]) => (
                <div key={question} className="bg-gray-50 p-4 rounded-lg">
                  <strong className="block mb-2 text-blue-600">{question}</strong>
                  <p className="text-gray-700">{answer}</p>
                </div>
              ))}
            </div>
            <button
              onClick={onComplete}
              className="mt-6 py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              Finish
            </button>
          </div>
        ) : (
          <p className="text-gray-600">Loading questions...</p>
        )}
      </div>
    </div>
  );
};

export default VoiceQuestionnaire;