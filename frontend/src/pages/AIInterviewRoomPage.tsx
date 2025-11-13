import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIInterviewRoom from '../components/AIInterviewRoom';
import AIInterviewIntro from '../components/AIInterviewIntro';

const sampleQuestions = [
    {
        id: 1,
        text: "Tell me about your experience with carpentry work.",
        expectedKeywords: ["wood", "tools", "construction", "building", "framing"]
    },
    {
        id: 2,
        text: "Have you operated power tools before? Which ones?",
        expectedKeywords: ["drill", "saw", "grinder", "safety", "equipment"]
    },
    {
        id: 3,
        text: "Describe a time when you worked as part of a team on a construction project.",
        expectedKeywords: ["team", "collaborate", "project", "communication", "together"]
    }
];

function AIInterviewRoomPage() {
    const navigate = useNavigate();
    const [started, setStarted] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [finalResults, setFinalResults] = useState<any[]>([]);


    const handleComplete = (results: any[]) => {
        setFinalResults(results);
        setIsComplete(true);
    };

    if (isComplete) {
        const correctCount = finalResults.filter(r => r.isCorrect).length;
        const totalCount = finalResults.length;
        const score = Math.round((correctCount / totalCount) * 100);

        return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
            <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                🎉 Interview Complete!
            </h1>
            
            <div className="text-center mb-8">
                <div className="text-6xl font-bold text-blue-600 mb-2">{score}%</div>
                <div className="text-gray-600">
                {correctCount} out of {totalCount} questions answered correctly
                </div>
            </div>

            <div className="space-y-4 mb-8">
                {finalResults.map((result, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-2 ${
                    result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                }`}>
                    <div className="font-semibold text-gray-800 mb-2">
                    Question {idx + 1}: {result.isCorrect ? '✅' : '⚠️'}
                    </div>
                    <div className="text-sm text-gray-600 italic">"{result.transcript}"</div>
                </div>
                ))}
            </div>

            <button
                onClick={() => navigate('/home')}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
                Return to Home
            </button>
            </div>
        </div>
        );
    }

    return (
        <>
        {
            !started ? (
                <AIInterviewIntro onStart={() => setStarted(true)} />
            ) : 
            (
                <AIInterviewRoom questions={sampleQuestions} onComplete={handleComplete}/>
            )
        }
        </>
    )
};

export default AIInterviewRoomPage;