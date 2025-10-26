import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import VoiceQuestionnaire from '../components/VoiceQuestionnaire';

function QuestionnairePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Try to get phone number from navigation state first
        const statePhone = location.state?.phoneNumber;

        if (statePhone) {
            // Save to sessionStorage for persistence
            sessionStorage.setItem('questionnairePhone', statePhone);
            setPhoneNumber(statePhone);
            setIsLoading(false);
        } else {
            // Try to get from sessionStorage
            const storedPhone = sessionStorage.getItem('questionnairePhone');

            if (storedPhone) {
                setPhoneNumber(storedPhone);
                setIsLoading(false);
            } else {
                // No phone number available, redirect
                navigate('/create-account', { replace: true });
            }
        }
    }, [location.state, navigate]);

    const handleQuestionnaireComplete = () => {
        // Clear the stored phone number
        sessionStorage.removeItem('questionnairePhone');
        // Redirect back to landing page after completion
        navigate('/');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    if (!phoneNumber) {
        return null; // Will redirect via useEffect
    }

    return (
        <VoiceQuestionnaire
            phoneNumber={phoneNumber}
            onComplete={handleQuestionnaireComplete}
        />
    );
}

export default QuestionnairePage;
