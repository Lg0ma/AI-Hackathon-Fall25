import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AIInterviewRoom from '../components/AIInterviewRoom';


const API_BASE_URL = 'http://127.0.0.1:8000';
// TODO: Get score and do the insert when they click on the Return to Home button

interface Job {
    title: string;
    description: string;
}

type Status = "reject" | "followup" | "hire";

function AIInterviewRoomPage() {
    const navigate = useNavigate();
    const { jobId } = useParams<{ jobId: string }>();
    const location = useLocation();
    
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [finalResults, setFinalResults] = useState<any[]>([]);

    // Try to get job from route state first, otherwise fetch it
    useEffect(() => {
        console.log("jobId: ", jobId )
        const fetchJobData = async () => {
            // Check if job data was passed via navigation state
            const stateJob = location.state?.job;
            
            if (stateJob && stateJob.description) {
                console.log('[AIInterviewRoomPage] Using job data from state');
                setJob(stateJob);
                setLoading(false);
                return;
            }

            // If no state data, fetch from API using employer_id
            if (!jobId) {
                setError('No job information available');
                setLoading(false);
                return;
            }

            try {
                console.log('[AIInterviewRoomPage] Fetching job data for employer:', jobId);
                const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to load job information');
                }

                const jobData = await response.json();
                console.log('[AIInterviewRoomPage] Job data fetched:', jobData);
                setJob(jobData);
                setLoading(false);

            } catch (err) {
                console.error('[AIInterviewRoomPage] Error fetching job:', err);
                setError(err instanceof Error ? err.message : 'Failed to load job');
                setLoading(false);
            }
        };

        fetchJobData();
    }, [jobId, location.state]);

    const handleComplete = (results: any[]) => {
        setFinalResults(results);
        setIsComplete(true);
    };

    const submitApplication = async (score: number, jobId: number | string) => {
        const appliedAt = new Date().toISOString();
        let status = "";
        if (score < 50)  {
            status = 'reject' as Status;
        } else if (score >= 50 && score < 90) {
            status = 'followup' as Status;
        } else {
            status = 'hire' as Status;
        }
        
        try {
            console.log(jobId, typeof(jobId), appliedAt, typeof(appliedAt), score, typeof(score))
            const response = await fetch(`${API_BASE_URL}/applications-router/submit-interview`, {
                method: 'POST',
                headers: { 'Content-Type' : 'application/json',},
                body: JSON.stringify({
                    user_id: "11111111-1111-1111-1111-111111111111",
                    job_listing_id: jobId,
                    status: status,
                    applied_at: appliedAt,
                    score: Number(score)
                })
            });

            const data = await response.json();
        } catch(error) {
            console.error(error);
            // setMessage("Network error or server not reachable");
        }
    
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Job Details...</h2>
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !job || !job.description) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Unable to Start Interview</h2>
                    <p className="text-gray-700 mb-6">
                        {error || 'Job information is incomplete. Please ensure the job has a description.'}
                    </p>
                    <button
                        onClick={() => navigate('/home')}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Browse Jobs
                    </button>
                </div>
            </div>
        );
    }

    // Completion state
    if (isComplete) {
        const correctCount = finalResults.filter(r => r.isCorrect).length;
        const totalCount = finalResults.length;
        const score = Math.round((correctCount / totalCount) * 100);

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
                    <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
                        🎉 Interview Complete!
                    </h1>
                    
                    <p className="text-center text-gray-600 mb-6">
                        Interview for: <strong>{job.title}</strong>
                    </p>
                    
                    <div className="text-center mb-8">
                        {/* <div className="text-6xl font-bold text-blue-600 mb-2">{score}%</div> */}
                        <div className="text-gray-600">
                            All questions have been answered
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        {finalResults.map((result, idx) => (
                            <div key={idx} className={`p-4 rounded-lg border-2 ${
                                'bg-green-50 border-green-200'
                            }`}>
                                <div className="font-semibold text-gray-800 mb-2">
                                    Question {idx + 1}
                                </div>
                                <div className="text-sm text-gray-600 italic mb-2">Response: "{result.transcript}"</div>
                                {/* <div className="text-sm text-gray-700">{result.feedback}</div> */}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => submitApplication(score, jobId)}
                        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    // Start interview
    return (
        <AIInterviewRoom
            jobDescription={job.description}
            jobTitle={job.title}
            jobId={job.id || jobId}
            onComplete={handleComplete}
        />
    );
}

export default AIInterviewRoomPage;