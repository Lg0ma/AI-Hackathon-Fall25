import { useState } from "react";
import { useNavigate } from "react-router-dom";
import profilePic from "../public/professional_pic copy.png";
import { JobCard } from "../components/JobCard";
import { JobDescription } from "../components/JobDescription";

function Home() {
    const [jobs, setJobs] = useState([]);
    const navigate = useNavigate();

    const goProfile = () => {
        console.log("Hello")
    };

    return (
        <>
        <nav className="flex justify-between bg-gradient-to-r from-blue-700 to-blue-800 py-5 text-white px-15 shadow-md">
            <div className="flex items-center text-5xl">Home</div>
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
            <div className="w-2/3 overflow-y-auto">
            <p>
                <JobDescription
                    employer_id="cbf96618-3bad-4e21-89d8-a900494da25a"
                    title="Commercial Painter"
                    description="ColorPro Finishes is seeking a skilled and reliable Commercial Painter to join our expanding team in Austin, TX. The ideal candidate will be responsible for preparing, priming, and painting interior and exterior surfaces of commercial properties, ensuring top-quality finishes and adherence to project timelines. Applicants should be comfortable working on ladders, scaffolding, and in varying weather conditions. Attention to detail, safety awareness, and professionalism are key traits for this role."
                    expected_skills="Surface preparation, spray painting, roller and brush techniques, color matching, safety compliance, blueprint reading, teamwork, time management"
                    years_of_experience_required={3}
                    created_at="2025-10-25T17:20:00Z"
                    postal_code="78701"
                />
            </p>
            <div className="h-[1500px]" /> {/* Example long content */}
            </div>
        </div>
        </>
    );
}

export default Home;