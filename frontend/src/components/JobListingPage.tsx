import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import profilePic from "../public/professional_pic copy.png";
import { JobCard } from "./JobCard";
import { JobDescription } from "./JobDescription";
import type { Job, InboxItem } from "../types";

interface JobListingPageProps {
    endpoint: string;
    pageType: 'Home' | 'Inbox';
    description?: string;
}

type JobData = Job | InboxItem;

function JobListingPage({ endpoint, pageType, description }: JobListingPageProps) {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<JobData[]>([]);
    const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);

    useEffect(() => {
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
                const response = await fetch(`http://localhost:8000${endpoint}`);
                if (!response.ok) {
                    throw new Error("Error fetching jobs");
                }

                const data: JobData[] = await response.json();
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
    }, [endpoint]);

    const getJobDetails = (job: JobData): Job => {
        if ('job_listings' in job) {
            return (job as InboxItem).job_listings;
        }
        return job as Job;
    }

    const extractCompany = (description: string) => {
        if (!description) return "Company";
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

    const handleJobClick = (job: JobData) => {
        const jobDetails = getJobDetails(job);
        if (isSmallScreen) {
            navigate(`/job/${jobDetails.employer_id}`, { state: { job: jobDetails } });
        } else {
            setSelectedJob(job);
        }
    };

    const selectedJobDetails = selectedJob ? getJobDetails(selectedJob) : null;

    return (
        <>
            {/* Navbar */}
            <nav className="flex justify-between bg-gradient-to-r from-blue-700 to-blue-800 py-5 text-white px-6 shadow-md">
                <div className="flex items-center">
                    <div className="text-3xl sm:text-5xl font-bold">JALE</div>
                    <button
                        onClick={() => navigate(pageType === 'Home' ? "/inbox" : "/home")}
                        className="ml-6 sm:ml-8 text-lg sm:text-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                        {pageType === 'Home' ? 'Inbox' : 'Home'}
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

            {description && (
                <div className="p-4 bg-white shadow-md">
                    <p className="text-center text-gray-600">{description}</p>
                </div>
            )}

            {/* Main layout */}
            <div className="flex flex-col sm:flex-row h-[calc(100vh-80px)] overflow-hidden">
                {/* Left column: Job list */}
                <div className="border-r-2 border-black w-full sm:w-1/3 overflow-y-auto bg-neutral-900">
                    {jobs.map((job) => {
                        const jobDetails = getJobDetails(job);
                        const key = 'id' in job ? (job as InboxItem).id : jobDetails.employer_id;
                        if (!jobDetails) return null;

                        return (
                            <JobCard
                                key={key}
                                company={extractCompany(jobDetails.description)}
                                title={jobDetails.title}
                                rate="Competitive"
                                employmentType="Full-time"
                                location={jobDetails.postal_code}
                                isNew={isJobNew(jobDetails.created_at)}
                                onClick={() => handleJobClick(job)}
                            />
                        )
                    })}
                </div>

                {/* Right column: Job details */}
                {!isSmallScreen && (
                    <div className="w-full sm:w-2/3 overflow-y-auto bg-neutral-50">
                        {selectedJobDetails ? (
                            <JobDescription
                                employer_id={selectedJobDetails.employer_id}
                                title={selectedJobDetails.title}
                                description={selectedJobDetails.description}
                                expected_skills={selectedJobDetails.expected_skills}
                                years_of_experience_required={
                                    selectedJobDetails.years_of_experience_required
                                }
                                created_at={selectedJobDetails.created_at}
                                postal_code={selectedJobDetails.postal_code}
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

export default JobListingPage;
