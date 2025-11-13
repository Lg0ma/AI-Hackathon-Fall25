import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface ApplicationWithJob {
    id: string;
    user_id: string;
    job_listing_id: string;
    status: 'reject' | 'followup' | 'hire' | string;
    applied_at: string;
    score: number;
    job_listings: {
        title: string;
        description: string;
        postal_code: string;
        created_at: string;
        employer_id: string;
    };
}

const ApplicationsPage: React.FC = () => {
    const navigate = useNavigate();
    // TODO: replace with real auth user id
    const userId = "11111111-1111-1111-1111-111111111111";
    const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/applications?user_id=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setApplications(data);
                }
            } catch (e) {
                console.error("Failed to fetch applications", e);
            } finally {
                setLoading(false);
            }
        };
        fetchApps();
    }, [userId]);

    const statusClasses = (status: string) => {
        if (status === 'reject') return 'bg-red-100 text-red-800';
        if (status === 'hire') return 'bg-green-100 text-green-800';
        return 'bg-yellow-100 text-yellow-800';
    };

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

            <div className="p-6">
                {loading ? (
                    <div className="text-gray-500">Loading applications...</div>
                ) : applications.length === 0 ? (
                    <div className="text-gray-500">No applications yet.</div>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app) => (
                            <div key={app.id} className="bg-white rounded-lg shadow border p-4 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold">{app.job_listings.title}</h3>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded ${statusClasses(app.status)}`}>
                                            {app.status === 'reject' ? 'Rejected' : app.status === 'hire' ? 'Hired' : 'In Review'}
                                        </span>
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded">Score: {app.score}</span>
                                    </div>
                                    <p className="text-gray-600 mt-1 line-clamp-2">{app.job_listings.description}</p>
                                    <div className="text-xs text-gray-500 mt-2">Applied {new Date(app.applied_at).toLocaleDateString()}</div>
                                </div>
                                <button
                                    onClick={() => window.open(`/job/${app.job_listings.employer_id}`, '_self')}
                                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                >
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApplicationsPage;
