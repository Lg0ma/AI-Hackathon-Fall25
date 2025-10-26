import React from "react";
import { Bookmark, Share2, MoreHorizontal, DollarSign, MapPin, Briefcase, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface JobDescriptionProps {
    employer_id: string;
    title: string;
    description: string;
    expected_skills: string;
    years_of_experience_required: number;
    created_at: string;
    postal_code: string;
}

export const JobDescription: React.FC<JobDescriptionProps> = ({
    employer_id,
    title,
    description,
    expected_skills,
    years_of_experience_required,
    created_at,
    postal_code
}) => {
    const navigate = useNavigate();

    const openDemoInterview = () => {
        // Navigate to live interview (streams skill_interview.py output)
    const roomName = "Candidate_Ivan_Interview";
        navigate(`/interview/${roomName}`);    
    };

    const openInterviewSession = () => {
        // Navigate to interview session
        navigate(`/interview-session/${employer_id}`);
    };

    // Calculate days ago
    const getDaysAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Format deadline date
    const getDeadlineDate = (dateString: string) => {
        const date = new Date(dateString);
        date.setDate(date.getDate() + 30); // 30 days from posting
        return date.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const daysAgo = getDaysAgo(created_at);
    const deadline = getDeadlineDate(created_at);

    return (
        <div className=" text-white p-8 h-screen overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-20 h-20 rounded-2xl bg-neutral-800 flex items-center justify-center text-3xl font-bold">
                            A
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-semibold text-neutral-200 mb-1">
                                Company Name
                            </h2>
                            <p className="text-black">Fashion</p>
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold mb-4">{title}</h1>

                    <div className="flex items-center gap-2 text-black mb-6">
                        <span>Posted {daysAgo} {daysAgo === 1 ? 'day' : 'days'} ago</span>
                        <span>•</span>
                        <span>Apply by {deadline}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mb-6">
                        <button className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors">
                            <Bookmark className="w-5 h-5" />
                            Save
                        </button>
                        <button
                        onClick={openInterviewSession}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
                            Start Interview
                        </button>
                        <button className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <hr className="border-neutral-700 mb-6" />

                {/* At a Glance Section */}
                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-6">At a glance</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <DollarSign className="w-6 h-6 text-black mt-1" />
                            <div>
                                <p className="text-xl font-semibold text-black">$20-30/hr</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <MapPin className="w-6 h-6 text-black mt-1" />
                            <div>
                                <p className="text-xl font-semibold text-black">Onsite, based in {postal_code}</p>
                                <p className="text-gray-700">Work in person from the location</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <Briefcase className="w-6 h-6 text-black mt-1" />
                            <div>
                                <p className="text-xl font-semibold text-black">Job</p>
                                <p className="text-black">Full-time</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <FileText className="w-6 h-6 text-black mt-1" />
                            <div>
                                <p className="text-xl font-semibold text-black">US work authorization required</p>
                                <p className="text-black">Open to candidates with OPT/CPT</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <Calendar className="w-6 h-6 text-black mt-1" />
                            <div>
                                <p className="text-xl font-semibold text-black">Experience Required</p>
                                <p className="text-black">{years_of_experience_required} {years_of_experience_required === 1 ? 'year' : 'years'} minimum</p>
                            </div>
                        </div>
                    </div>
                </section>

                <hr className="border-neutral-700 mb-6" />

                {/* Job Description */}
                <section className="mb-8">
                    <div className="text-black leading-relaxed whitespace-pre-line">
                        {description}
                    </div>
                    
                    {description.length > 300 && (
                        <button className="text-black mt-4 flex items-center gap-1 hover:text-neutral-300">
                            More
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}
                </section>

                <hr className="border-neutral-700 mb-6" />

                {/* What they're looking for */}
                {/* <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-6">What they're looking for</h2>
                    <div className="text-black leading-relaxed whitespace-pre-line mb-4">
                        {expected_skills}
                    </div>
                </section>
                <hr className="border-neutral-700 mb-6" /> */}

                {/* What this job offers */}
                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-6">What this job offers</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-black">• $20-30/hr</div>
                        <div className="text-black">• 401(k) match</div>
                    </div>
                </section>

                <hr className="border-neutral-700 mb-6" />

                {/* About the Employer */}
                <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-6">About the employer</h2>
                    
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center text-2xl font-bold">
                                A
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">Company Name</h3>
                                <p className="text-black">Fashion</p>
                            </div>
                        </div>
                        
                    </div>

                    <div className="flex items-center gap-6 text-black">
                        <div className="flex items-center gap-2">
                            <span>👥 1-10 employees</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>📍 {postal_code}</span>
                        </div>
                    </div>
                </section>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-3 pt-6 border-t border-neutral-700 mb-30">
                    <button className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-2 transition-colors">
                        <Bookmark className="w-5 h-5" />
                        Save
                    </button>
                    <button
                    onClick={openDemoInterview}>
                        Start Interview Call
                        
                    </button>
                </div>
            </div>
        </div>
    );
};