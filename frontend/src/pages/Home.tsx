import { useState } from "react";
import { useNavigate } from "react-router-dom";
import profilePic from "../public/professional_pic copy.png";
import { JobCard } from "../components/JobCard";

function Home() {
    const [jobs, setJobs] = useState([]);
    const navigate = useNavigate();

    const goProfile = () => {
        console.log("Hello")
    };

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

        {/* Main container — fixed height and no scrolling */}
        <div className="flex h-[calc(100vh-80px)] overflow-hidden">
            {/* Left: Job list (scrollable) */}
            <div className="border-r-2 border-black w-1/3 overflow-y-auto">
            <JobCard
                company="Azarhia LLC"
                title="Junior Front End Developer"
                rate="$20-30/hr"
                employmentType="Full-time"
                location="Coleman, TX"
                isNew={true}
            />

            <JobCard
                company="Tech Solutions Inc"
                title="Senior React Developer"
                rate="$50-70/hr"
                employmentType="Contract"
                location="Austin, TX"
                isNew={false}
            />

            {/* rest of job cards */}
            {Array.from({ length: 8 }).map((_, i) => (
                <JobCard
                key={i}
                company="StartupXYZ"
                title="Full Stack Engineer"
                rate="$40-60/hr"
                employmentType="Full-time"
                location="Remote"
                isNew={true}
                companyLogo="https://placehold.co/64x64/4f46e5/ffffff?text=SX"
                />
            ))}
            </div>

            {/* Right: Job details section (also scrollable) */}
            <div className="w-2/3 overflow-y-auto p-4">
            <h2 className="text-3xl font-semibold mb-4">Job Details</h2>
            <p>
                Here you can display the selected job description, requirements,
                etc. This container can scroll independently from the job list.
            </p>
            <div className="h-[1500px]" /> {/* Example long content */}
            </div>
        </div>
        </>
    );
}

export default Home;
