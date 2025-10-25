import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface JobPost {
  id: number;
  title: string;
  company: string;
  description: string;
  pay: string;
  location: string;
  hours: string;
  type: string;
  startDate: string;
  requirements: string[];
  applicants: number;
  posted: string;
  status: 'active' | 'draft' | 'closed';
}

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [postedJobs, setPostedJobs] = useState<JobPost[]>([
    {
      id: 1,
      title: "Warehouse Worker",
      company: "ABC Logistics",
      description: "Load and unload trucks, move boxes and pallets, use pallet jack and forklift, keep warehouse organized. We're looking for reliable team members who can handle physical work.",
      pay: "$16/hour",
      location: "Downtown",
      hours: "Monday-Friday, 7am-4pm",
      type: "Full-time",
      startDate: "Immediately",
      requirements: ["Can lift 40 lbs", "Forklift experience preferred", "Reliable transportation"],
      applicants: 12,
      posted: "2 days ago",
      status: 'active'
    }
  ]);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    pay: '',
    location: '',
    hours: '',
    type: 'Full-time',
    startDate: '',
    requirements: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: JobPost = {
      id: postedJobs.length + 1,
      ...formData,
      requirements: formData.requirements.split(',').map(r => r.trim()).filter(r => r),
      applicants: 0,
      posted: 'Just now',
      status: 'active'
    };
    setPostedJobs(prev => [newJob, ...prev]);
    setFormData({
      title: '',
      company: '',
      description: '',
      pay: '',
      location: '',
      hours: '',
      type: 'Full-time',
      startDate: '',
      requirements: ''
    });
    setShowForm(false);
  };

  const activeJobs = postedJobs.filter(job => job.status === 'active');
  const displayedJobs = activeTab === 'active' ? activeJobs : postedJobs;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Job Platform</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-sm font-medium text-handshake-red border-b-2 border-handshake-red pb-[21px]">Jobs</a>
                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 pb-[21px]">Applications</a>
                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 pb-[21px]">Analytics</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/landing')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Switch View
              </button>
              <div className="w-8 h-8 bg-handshake-red rounded-full flex items-center justify-center text-white text-sm font-medium">
                AC
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-handshake-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{activeJobs.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Applicants</p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{postedJobs.reduce((sum, job) => sum + job.applicants, 0)}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">New This Week</p>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">8</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Avg. Response Rate</p>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">87%</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-1 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'active'
                  ? 'bg-handshake-red text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({activeJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === 'all'
                  ? 'bg-handshake-red text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Jobs ({postedJobs.length})
            </button>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-handshake-red hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition duration-200 flex items-center shadow-sm hover:shadow"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post New Job
          </button>
        </div>

        {/* Job Posting Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Create Job Posting</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Basic Information</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Warehouse Worker"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                      placeholder="Your company name"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none transition"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    placeholder="Describe the job responsibilities, daily tasks, and what makes this opportunity great..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none resize-none transition"
                  />
                </div>
              </div>

              {/* Compensation & Type */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Compensation & Employment Type</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pay Range <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pay"
                      value={formData.pay}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., $16/hour or $40,000-50,000/year"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none cursor-pointer transition"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Location & Schedule */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Location & Schedule</h4>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Downtown, Remote"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Hours <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="hours"
                      value={formData.hours}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Mon-Fri, 9am-5pm"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Immediately"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Requirements</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Requirements <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    placeholder="List required skills, experience, equipment, etc. (separate with commas)"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none resize-none transition"
                  />
                  <p className="mt-2 text-sm text-gray-500">Separate each requirement with a comma</p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-handshake-red hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition duration-200 shadow-sm hover:shadow"
                >
                  Publish Job
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Posted Jobs List */}
        <div className="space-y-4">
          {displayedJobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl border border-gray-200 hover:border-handshake-red transition-colors p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-bold text-gray-900">{job.title}</h4>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          job.status === 'active' ? 'bg-green-100 text-green-700' :
                          job.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">{job.company}</p>

                      <div className="flex flex-wrap gap-3 mb-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg">
                          {job.pay}
                        </span>
                        <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg">
                          {job.location}
                        </span>
                        <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg">
                          {job.type}
                        </span>
                        <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg">
                          {job.applicants} applicants
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button className="p-2.5 text-gray-600 hover:text-handshake-red hover:bg-red-50 rounded-lg transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button className="p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">Posted {job.posted}</span>
                <button className="bg-handshake-red hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-200">
                  View Applications ({job.applicants})
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
