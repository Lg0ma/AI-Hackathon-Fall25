import React from 'react';

interface InitialScreenProps {
  setCreatingAccount: (value: boolean) => void;
}

const InitialScreen: React.FC<InitialScreenProps> = ({ setCreatingAccount }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-8">
      <h1 className="text-5xl font-bold text-gray-900 mb-4">
        Welcome to Jale
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Your AI-powered hiring assistant
      </p>
      <div className="flex gap-4">
        <button 
          onClick={() => alert('Sign in functionality not implemented yet.')}
          className="py-3 px-6 bg-white border-2 border-blue-600 text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          Sign In
        </button>
        <button 
          onClick={() => setCreatingAccount(true)}
          className="py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Create Account
        </button>
      </div>
    </div>
  );
};

export default InitialScreen;