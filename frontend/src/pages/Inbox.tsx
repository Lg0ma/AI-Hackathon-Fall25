import React from 'react';
import InboxList from '../components/InboxList';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Inbox: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center">
      <div className="w-full max-w-3xl px-6 py-8">
        <div className="flex justify-between mb-6">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-800">Inbox</h1>
          <div className="w-8" /> {/* spacer to balance layout */}
        </div>

        <div className="bg-white shadow-lg rounded-2xl p-4 md:p-6">
          <InboxList />
        </div>
      </div>
    </div>
  );
};

export default Inbox;
