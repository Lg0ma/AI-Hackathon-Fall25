import React from 'react';
import JobListingPage from '../components/JobListingPage';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const ApplicationsPage: React.FC = () => {
    const navigate = useNavigate();
    // Placeholder for the logged-in user's ID
    const userId = "user-placeholder-id";

    return (
        <div>
            <div className="p-4 bg-white shadow-md flex items-center justify-between">
                <h1 className="text-3xl font-bold">My Applications</h1>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>
            </div>
            <JobListingPage 
                endpoint={`/api/applications?user_id=${userId}`} 
                pageType="Inbox" // Using "Inbox" pageType to get the right nav behavior
                description="These are the jobs you have applied for."
            />
        </div>
    );
};

export default ApplicationsPage;
