import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ResumePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Resume Feature</h1>
        <p className="text-lg text-gray-600 mb-8">This functionality is currently under development. Check back soon!</p>
        <button
          onClick={() => navigate(-1)} // Go back to the previous page
          className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </button>
      </div>
    </div>
  );
};

export default ResumePage;
