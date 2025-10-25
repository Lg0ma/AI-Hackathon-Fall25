import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BasicInfoForm from '../components/BasicInfoForm';
import VoiceQuestionnaire from '../components/VoiceQuestionnaire';

function CreateAccount() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'form' | 'questionnaire'>('form');
    const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);

    const handleAccountCreated = (phoneNumber: string) => {
        setUserPhoneNumber(phoneNumber);
        setStep('questionnaire');
    };

    const handleQuestionnaireComplete = () => {
        // Redirect back to landing page after completion
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            {step === 'form' && (
                <BasicInfoForm onAccountCreated={handleAccountCreated} />
            )}
            {step === 'questionnaire' && userPhoneNumber && (
                <VoiceQuestionnaire
                    phoneNumber={userPhoneNumber}
                    onComplete={handleQuestionnaireComplete}
                />
            )}
        </div>
    );
}

export default CreateAccount;
