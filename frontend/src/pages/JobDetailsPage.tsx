// src/pages/JobDetailsPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { JobDescription } from "../components/JobDescription";

interface Job {
  employer_id: string;
  title: string;
  description: string;
  expected_skills: string;
  years_of_experience_required: number;
  created_at: string;
  postal_code: string;
}

export default function JobDetailsPage() {
    const { employer_id } = useParams<{ employer_id: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);

    useEffect(() => {
    const fetchJob = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/jobs/${employer_id}`);
            if (!res.ok) throw new Error("Failed to fetch job");
            const data = await res.json();
            setJob(data);
        } catch (err) {
            console.error(err);
        }
    };

    fetchJob();
}, [employer_id]);

if (!job) return <p className="p-6 text-center">Loading job...</p>;

    return (
        <div className="min-h-screen bg-white text-white">
            <div className="flex items-center justify-between p-4 bg-blue-800">
                <button
                    onClick={() => navigate(-1)}
                    className="text-white font-semibold bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded"
                >
                    ←
                </button>
            <p className="text-xl font-bold text-white">Job Details</p>
            <div />
        </div>

        <JobDescription {...job} />
    </div>
    );
}
