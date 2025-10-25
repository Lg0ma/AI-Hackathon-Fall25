import React, { useState } from 'react';
import InitialScreen from './components/InitialScreen';
import BasicInfoForm from './components/BasicInfoForm';
import VoiceQuestionnaire from './components/VoiceQuestionnaire';
import './App.css';

function App() {
  const [appState, setAppState] = useState('initial'); // initial, creatingAccount, fillingDetails
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);

  const handleAccountCreated = (phoneNumber: string) => {
    setUserPhoneNumber(phoneNumber);
    setAppState('fillingDetails');
  };

  const handleQuestionnaireComplete = () => {
    setAppState('initial');
    setUserPhoneNumber(null);
  };

  const renderContent = () => {
    switch (appState) {
      case 'creatingAccount':
        return <BasicInfoForm onAccountCreated={handleAccountCreated} />;
      case 'fillingDetails':
        return <VoiceQuestionnaire phoneNumber={userPhoneNumber!} onComplete={handleQuestionnaireComplete} />;
      case 'initial':
      default:
        return <InitialScreen setCreatingAccount={() => setAppState('creatingAccount')} />;
    }
  };

  return (
    <div className="App">
      {renderContent()}
    </div>
  );
}

export default App;