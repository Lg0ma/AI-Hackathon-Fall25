import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, MapPin, Calendar, Users } from "lucide-react";

interface Job {
  employer_id: string;
  title: string;
  description: string;
  expected_skills: string | null;
  years_of_experience_required: number;
  created_at: string;
  postal_code: string;
}

const ManageJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Hardcoded employer ID - replace with actual auth later
  const employerId = "cbf96618-3bad-4e21-89d8-a900494da25a";

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/employer/${employerId}/jobs`
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Employer jobs:", data);
          setJobs(data);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [employerId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/employer/dashboard")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">My Job Posts</h1>
            </div>
            <button
              onClick={() => navigate("/employer/create-job")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading your jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No jobs posted yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start finding great candidates by posting your first job
              </p>
              <button
                onClick={() => navigate("/employer/create-job")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Post Your First Job
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {jobs.map((job, index) => (
              <div
                key={job.employer_id + index}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      {getDaysAgo(job.created_at) <= 7 && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{job.postal_code}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Posted {formatDate(job.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>0 applicants</span>
                      </div>
                    </div>

                    {/* Skills Section with null check */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.expected_skills ? (
                        <>
                          {job.expected_skills.split(",").slice(0, 5).map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                          {job.expected_skills.split(",").length > 5 && (
                            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded">
                              +{job.expected_skills.split(",").length - 5} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm italic">No skills specified</span>
                      )}
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <button
                      onClick={() => navigate(`/employer/edit-job/${job.employer_id}`)}
                      className="flex-1 lg:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => navigate(`/employer/applicants/${job.employer_id}`)}
                      className="flex-1 lg:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      View Applicants
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ManageJobs;