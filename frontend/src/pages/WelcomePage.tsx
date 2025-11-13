import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Mail, FileText, User } from 'lucide-react';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  // Placeholder for user's name
  const userName = "User";

  const options = [
    {
      title: "View Job Listings",
      description: "Browse and search for new job opportunities.",
      icon: <Briefcase className="w-10 h-10 text-blue-500" />,
      path: "/home",
      buttonText: "Browse Jobs",
    },
    {
      title: "View Applications",
      description: "Check the status of your submitted applications.",
      icon: <Mail className="w-10 h-10 text-green-500" />,
      path: "/applications",
      buttonText: "My Applications",
    },
    {
      title: "Manage Resume",
      description: "Create, view, or update your resume.",
      icon: <FileText className="w-10 h-10 text-purple-500" />,
      path: "/resume",
      buttonText: "My Resume",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Jale</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">Welcome, {userName}</span>
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-500" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 md:p-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-lg text-gray-600 mt-2">What would you like to do today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {options.map((option) => (
            <div
              key={option.title}
              className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 group flex flex-col"
            >
              <div className="p-8 flex-grow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gray-100 p-3 rounded-full">
                    {option.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">{option.title}</h3>
                </div>
                <p className="text-gray-600 mb-6">{option.description}</p>
              </div>
              <button
                onClick={() => navigate(option.path)}
                className="w-full bg-gray-50 text-gray-700 font-bold py-4 px-8 text-left group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300"
              >
                {option.buttonText} &rarr;
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default WelcomePage;
