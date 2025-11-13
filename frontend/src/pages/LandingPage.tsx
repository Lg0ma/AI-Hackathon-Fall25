import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-blue-600 text-white flex flex-col items-center justify-center text-center p-4">
      <div className="absolute top-8 right-8">
        <button
          onClick={() => navigate('/employer')}
          className="bg-white text-black font-bold py-2 px-6 rounded-full hover:opacity-80 transition-transform transform hover:scale-105"
        >
          For Employers
        </button>
      </div>
      <div className="max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white">Welcome to Jale</h1>
        <p className="text-lg md:text-xl mb-8">
          Your new platform for connecting skilled workers with the right job opportunities. 
          Whether you're looking for your next project or searching for qualified talent, Jale makes it simple.
        </p>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-black font-bold py-3 px-8 rounded-full hover:opacity-80 transition-transform transform hover:scale-105"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/create-account')}
            className="bg-white text-black font-bold py-3 px-8 rounded-full hover:opacity-80 transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;