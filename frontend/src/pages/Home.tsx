import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import profilePic from "../public/professional_pic copy.png";
import { JobCard } from "../components/JobCard";
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

function Home() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const goProfile = () => {
        console.log("Hello");
    };

    useEffect(() => {
        const fetchJobs = async() => {
            try {
                const response = await fetch('http://localhost:8000/api/jobs');
                if (!response.ok) {
                    throw new Error("Error fetching jobs");
                }

                const data: Job[] = await response.json();
                console.log("=: ", data);
                setJobs(data);
                if (data.length > 0) {
                    setSelectedJob(data[0]); // Select first job by default
                }
            } catch(err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError("An unknown error occurred");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, []);

    // Helper function to extract company name from description
    const extractCompany = (description: string) => {
        const match = description.match(/^([A-Za-z\s&]+)\s+is seeking/);
        return match ? match[1] : "Company";
    };

    // Helper function to check if job is new (posted within last 7 days)
    const isJobNew = (created_at: string) => {
        const jobDate = new Date(created_at);
        const now = new Date();
        const diffDays = Math.ceil((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    };

    if (loading) return <p className="p-8 flex justify-center items-center">Loading jobs...</p>;
    if (error) return <p className="p-8 flex justify-center items-center">Error: {error}</p>;

    return (
        <>
        <nav className="flex justify-between bg-gradient-to-r from-blue-700 to-blue-800 py-5 text-white px-15 shadow-md">
            <div className="flex items-center">
                <div className="text-5xl">Home</div>
                <button onClick={() => navigate("/inbox")} className="ml-8 text-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded">
                    Inbox
                </button>
            </div>
            <div>
            <img
                onClick={goProfile}
                src={profilePic}
                alt="User Profile"
                className="w-16 h-16 rounded-full object-cover shadow-lg cursor-pointer"
            />
            </div>
        </nav>

            {/* Main container */}
            <div className="flex h-[calc(100vh-80px)] overflow-hidden">
                {/* Left: Job list (scrollable) */}
                <div className="border-r-2 border-black w-1/3 overflow-y-auto">
                    {jobs.map((job) => (
                        <JobCard
                            key={job.employer_id}
                            company={extractCompany(job.description)}
                            title={job.title}
                            rate="Competitive" // You can add this field to your database later
                            employmentType="Full-time" // You can add this field to your database later
                            location={job.postal_code}
                            isNew={isJobNew(job.created_at)}
                            onClick={() => setSelectedJob(job)}
                        />
                    ))}
                </div>

                {/* Right: Job details section (scrollable) */}
                <div className="w-2/3 overflow-y-auto">
                    {selectedJob ? (
                        <JobDescription
                            employer_id={selectedJob.employer_id}
                            title={selectedJob.title}
                            description={selectedJob.description}
                            expected_skills={selectedJob.expected_skills}
                            years_of_experience_required={selectedJob.years_of_experience_required}
                            created_at={selectedJob.created_at}
                            postal_code={selectedJob.postal_code}
                        />
                    ) : (
                        <p className="p-8 text-gray-500">Select a job to view details</p>
                    )}
                </div>
            </div>
        </>
    );
}

export default Home;