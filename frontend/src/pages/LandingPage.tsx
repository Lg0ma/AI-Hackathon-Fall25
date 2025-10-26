import React from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
    const navigate = useNavigate();

    const createAccount = () => {
        navigate("/create-account");
    };

    const loginAccount = () => {
        navigate("/login");
    };

    const openDemoInterview = () => {
        const roomName = "Candidate_Ivan_Interview";
        navigate(`/interview/${roomName}`);
    };

    const goHome = () => {
        navigate('/home')
    }

    const startDemoInterview = () => {
        // Demo job data for testing
        const demoJob = {
            title: "Construction Worker - General Laborer",
            description: `We are seeking reliable construction workers to join our team for residential and commercial projects.

Requirements:
- 2+ years of experience in construction or related field
- Ability to operate hand tools and power tools safely
- Knowledge of basic carpentry and framing
- Experience with concrete work (pouring, finishing)
- Ability to read and interpret blueprints and building plans
- Valid driver's license and reliable transportation
- Ability to lift 50+ pounds regularly
- Strong attention to detail and safety protocols
- Good communication and teamwork skills

Preferred Qualifications:
- OSHA 10 or OSHA 30 certification
- Forklift operation certification
- Experience with drywall installation and finishing`,
            expected_skills: "Construction, Carpentry, Power Tools, Safety"
        };

        navigate('/interview-session/demo', { state: { job: demoJob } });
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            {/* Card */}
            <div className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-md text-center border border-blue-100">
                {/* Logo/Brand Area */}
                <div className="mb-8">
                    <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full w-16 h-16 flex items-center justify-center mb-4 shadow-lg">
                        <span className="text-3xl font-bold leading-none ">J</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Welcome to Jale
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Your path to streamlined hiring and interviews starts here
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3 mb-6">
                    <button
                        onClick={createAccount}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                        Create Account
                    </button>

                    <button
                        onClick={loginAccount}
                        className="w-full py-4 px-6 bg-white border-2 border-blue-600 text-blue-700 font-semibold rounded-xl shadow-md hover:bg-blue-50 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-200"
                    >
                        Login Account
                    </button>
                </div>

                {/* Separator */}
                <div className="flex items-center my-8">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-sm font-medium">DEMO</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Demo Buttons */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={startDemoInterview}
                        className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center gap-2"
                    >
                        <span>🎤</span>
                        <span>Try AI Interview</span>
                    </button>

                    <button
                        onClick={goHome}
                        className="w-full py-4 px-6 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-gray-600 hover:to-gray-800 transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-gray-300 flex items-center justify-center gap-2"
                    >
                        <span>Browse Jobs</span>
                    </button>
                </div>

                {/* Footer Text */}
                <p className="mt-8 text-sm text-gray-500">
                    Creating new opportunities for great talent
                </p>
            </div>
        </div>
    );
}

export default LandingPage;