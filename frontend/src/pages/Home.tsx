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
    const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

    useEffect(() => {
        // Detect screen size dynamically
        const handleResize = () => {
        setIsSmallScreen(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const goProfile = () => {
        console.log("Go to profile");
    };

    useEffect(() => {
        const fetchJobs = async () => {
        try {
            const response = await fetch("http://localhost:8000/api/jobs");
            if (!response.ok) {
            throw new Error("Error fetching jobs");
            }

            const data: Job[] = await response.json();
            setJobs(data);
            if (data.length > 0) setSelectedJob(data[0]);
        } catch (err: unknown) {
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

    const extractCompany = (description: string) => {
        const match = description.match(/^([A-Za-z\s&]+)\s+is seeking/);
        return match ? match[1] : "Company";
    };

    const isJobNew = (created_at: string) => {
        const jobDate = new Date(created_at);
        const now = new Date();
        const diffDays = Math.ceil(
        (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays <= 7;
    };

    if (loading)
        return <p className="p-8 flex justify-center items-center">Loading jobs...</p>;
    if (error)
        return <p className="p-8 flex justify-center items-center">Error: {error}</p>;

    const handleJobClick = (job: Job) => {
        if (isSmallScreen) {
        // Navigate to the dedicated job page for small screens
        navigate(`/job/${job.employer_id}`, { state: { job } });
        } else {
        // Select the job in-place for large screens
        setSelectedJob(job);
        }
    };

    return (
        <>
        {/* Navbar */}
        <nav className="flex justify-between bg-gradient-to-r from-blue-700 to-blue-800 py-5 text-white px-6 shadow-md">
            <div className="flex items-center">
            <div className="text-3xl sm:text-5xl font-bold">Home</div>
            <button
                onClick={() => navigate("/inbox")}
                className="ml-6 sm:ml-8 text-lg sm:text-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg"
            >
                Inbox
            </button>
            </div>
            <div>
            <img
                onClick={goProfile}
                src={profilePic}
                alt="User Profile"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shadow-lg cursor-pointer"
            />
            </div>
        </nav>

        {/* Main layout */}
        <div className="flex flex-col sm:flex-row h-[calc(100vh-80px)] overflow-hidden">
            {/* Left column: Job list */}
            <div className="border-r-2 border-black w-full sm:w-1/3 overflow-y-auto bg-neutral-900">
            {jobs.map((job) => (
                <JobCard
                key={job.employer_id}
                company={extractCompany(job.description)}
                title={job.title}
                rate="Competitive"
                employmentType="Full-time"
                location={job.postal_code}
                isNew={isJobNew(job.created_at)}
                onClick={() => handleJobClick(job)}
                />
            ))}
            </div>

            {/* Right column: Job details */}
            {!isSmallScreen && (
            <div className="w-full sm:w-2/3 overflow-y-auto bg-neutral-50">
                {selectedJob ? (
                <JobDescription
                    employer_id={selectedJob.employer_id}
                    title={selectedJob.title}
                    description={selectedJob.description}
                    expected_skills={selectedJob.expected_skills}
                    years_of_experience_required={
                    selectedJob.years_of_experience_required
                    }
                    created_at={selectedJob.created_at}
                    postal_code={selectedJob.postal_code}
                />
                ) : (
                <p className="p-8 text-gray-500">Select a job to view details</p>
                )}
            </div>
            )}
        </div>
        </>
    );
}

export default Home;
