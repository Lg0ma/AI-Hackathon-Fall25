import React from 'react';
import './InitialScreen.css';

interface InitialScreenProps {
  setCreatingAccount: (value: boolean) => void;
}

const InitialScreen: React.FC<InitialScreenProps> = ({ setCreatingAccount }) => {
  return (
    <div className="initial-screen-container">
      <h1>Welcome to Jale</h1>
      <p>Your AI-powered hiring assistant</p>
      <div className="button-group">
        <button onClick={() => alert('Sign in functionality not implemented yet.')}>Sign In</button>
        <button onClick={() => setCreatingAccount(true)}>Create Account</button>
      </div>
    </div>
  );
};

export default InitialScreen;
