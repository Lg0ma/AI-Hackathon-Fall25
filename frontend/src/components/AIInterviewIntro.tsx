import React, { useState, } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Volume2, CheckCircle, ArrowRight, Info, ArrowLeft } from "lucide-react";

interface AIInterviewIntroProps {
    onStart: () => void;
    onTestSpeech?: () => void;
    onTestMic?: () => void;
    questionCount?: number;
    estimatedTime?: string;
}

const AIInterviewIntro: React.FC<AIInterviewIntroProps> = ({
    onStart,
    onTestSpeech,
    onTestMic,
    questionCount = 5,
    estimatedTime = "10–15 minutes",
}) => {
const [testing, setTesting] = useState(false);
const navigate = useNavigate();

const handleTestSpeech = () => {
    if (onTestSpeech) {
        onTestSpeech();
    } else {
        const msg = new SpeechSynthesisUtterance(
        "This is a test of the voice feature. If you can hear me, everything is working correctly."
        );
        msg.rate = 1;
        msg.pitch = 1;
        msg.volume = 1;
        window.speechSynthesis.speak(msg);
    }
};

const handleTestMic = async () => {
    try {
        setTesting(true);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setTimeout(() => {
            stream.getTracks().forEach((t) => t.stop());
            setTesting(false);
            alert("✅ Microphone is working!");
        }, 2000);
    } catch {
        alert("⚠️ Please allow microphone access to test it.");
        setTesting(false);
    }
};

const goHome = () => {
    navigate('/home');
}

return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-10 text-center">
            {/* Header */}
            <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
                Welcome to Your AI Interview
            </h1>
            <p className="text-gray-600 text-lg">
                Get ready to experience an interactive, voice-based interview. 
                You’ll hear questions read aloud, answer verbally, and receive instant AI feedback.
            </p>
            </div>

            {/* Interview Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 text-center">
            <div className="p-5 rounded-xl bg-blue-50 border border-blue-100">
                <Volume2 className="mx-auto text-blue-600 w-10 h-10 mb-3" />
                <h3 className="text-lg font-semibold text-gray-800">Listen</h3>
                <p className="text-gray-600 text-sm">
                Each question will be read aloud automatically.
                </p>
            </div>
            <div className="p-5 rounded-xl bg-green-50 border border-green-100">
                <Mic className="mx-auto text-green-600 w-10 h-10 mb-3" />
                <h3 className="text-lg font-semibold text-gray-800">Speak</h3>
                <p className="text-gray-600 text-sm">
                Answer naturally — your microphone will record your response.
                </p>
            </div>
            <div className="p-5 rounded-xl bg-yellow-50 border border-yellow-100">
                <CheckCircle className="mx-auto text-yellow-600 w-10 h-10 mb-3" />
                <h3 className="text-lg font-semibold text-gray-800">Analyze</h3>
                <p className="text-gray-600 text-sm">
                The AI will assess your response and provide feedback instantly.
                </p>
            </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-8 mb-10">
            <div>
                <p className="text-2xl font-bold text-blue-600">{questionCount}</p>
                <p className="text-gray-500 text-sm">Questions</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-blue-600">{estimatedTime}</p>
                <p className="text-gray-500 text-sm">Estimated Time</p>
            </div>
            </div>

            {/* Test Buttons */}
            <div className="flex space-y-4 mb-10 gap-4 justify-center">
            <button
                onClick={handleTestSpeech}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
                Test Text-to-Speech
            </button>
            <button
                onClick={handleTestMic}
                disabled={testing}
                className={`w-full sm:w-auto px-8 py-3 font-semibold rounded-lg transition-colors h-min
                    ${testing
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
            >
                {testing ? "Testing..." : "Test Microphone"}
            </button>
            </div>

            {/* Disclaimer */}
            <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3 text-left mb-10">
            <Info className="w-6 h-6 text-gray-500 flex-shrink-0" />
            <p className="text-gray-600 text-sm leading-relaxed">
                Your microphone and voice data are used only during this session and 
                are not stored after completion. Please ensure you are in a quiet environment 
                and have a stable internet connection for the best experience.
            </p>
            </div>

            <div className="flex gap-5">
                {/* Back button */}
                <button
                    onClick={goHome}
                    className="w-1/3 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                    <ArrowLeft className="w-5 h-5"/>
                    Back
                </button>
                {/* Start Button */}
                <button
                onClick={onStart}
                className="w-2/3 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                Start Interview
                <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
        </div>
    );
};

export default AIInterviewIntro;
