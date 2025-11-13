import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CreateJobPosting = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        expected_skills: "",
        years_of_experience_required: "",
        postal_code: "",
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setFormData({
        ...formData,
        [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
        const response = await fetch("http://localhost:8000/api/postjob", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            ...formData,
            years_of_experience_required: parseInt(
                formData.years_of_experience_required
            ),
            employer_id: "e1f78b44-3023-4a51-9e84-79e9a8b2b580", // Replace with actual employer ID from auth/session
            }),
        });

        if (response.ok) {
            alert("✅ Job posted successfully!");
            navigate("/employer");
        } else {
            const err = await response.json();
            alert(`❌ Failed to post job: ${err.detail || "Unknown error"}`);
        }
        } catch (error) {
        console.error("Error posting job:", error);
        alert("⚠️ An error occurred while posting the job.");
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <button
                onClick={() => navigate("/employer")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Post a New Job</h1>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex justify-center items-center px-4 py-8">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-lg border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Job Title */}
                <div>
                <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-900 mb-2"
                >
                    Job Title *
                </label>
                <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Auto Mechanic"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                </div>

                {/* Job Description */}
                <div>
                <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-900 mb-2"
                >
                    Job Description *
                </label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the responsibilities, environment, and requirements..."
                    rows={6}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                />
                <p className="text-sm text-gray-500 mt-1">
                    Be detailed about the role and expectations.
                </p>
                </div>

                {/* Expected Skills */}
                <div>
                <label
                    htmlFor="expected_skills"
                    className="block text-sm font-medium text-gray-900 mb-2"
                >
                    Required Skills *
                </label>
                <input
                    id="expected_skills"
                    name="expected_skills"
                    type="text"
                    value={formData.expected_skills}
                    onChange={handleChange}
                    placeholder="e.g., Diagnostics, Engine Repair, Electrical Systems"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-sm text-gray-500 mt-1">
                    Separate multiple skills with commas.
                </p>
                </div>

                {/* Years of Experience */}
                <div>
                <label
                    htmlFor="years_of_experience_required"
                    className="block text-sm font-medium text-gray-900 mb-2"
                >
                    Years of Experience Required *
                </label>
                <input
                    id="years_of_experience_required"
                    name="years_of_experience_required"
                    type="number"
                    min="0"
                    value={formData.years_of_experience_required}
                    onChange={handleChange}
                    placeholder="e.g., 3"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                </div>

                {/* Postal Code */}
                <div>
                <label
                    htmlFor="postal_code"
                    className="block text-sm font-medium text-gray-900 mb-2"
                >
                    Location (Postal Code) *
                </label>
                <input
                    id="postal_code"
                    name="postal_code"
                    type="text"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="e.g., 77005"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                    type="button"
                    onClick={() => navigate("/employer/dashboard")}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 
                    rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg 
                    hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed 
                    transition-colors font-medium"
                >
                    {loading ? "Posting..." : "Post Job"}
                </button>
                </div>
            </form>
            </div>
        </main>
        </div>
    );
    };

export default CreateJobPosting;