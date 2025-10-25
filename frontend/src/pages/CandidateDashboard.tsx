import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Job {
  id: number;
  title: string;
  company: string;
  pay: string;
  location: string;
  hours: string;
  type: string;
  requirements: string[];
  description: string;
  posted: string;
}

const JOBS: Job[] = [
  {
    id: 1,
    title: "Warehouse Worker",
    company: "ABC Logistics",
    pay: "$16/hour",
    location: "Downtown",
    hours: "Monday-Friday, 7am-4pm",
    type: "Full-time",
    requirements: ["Can lift 40 lbs", "Forklift experience preferred", "Reliable transportation"],
    description: "Load and unload trucks, move boxes and pallets, use pallet jack and forklift, keep warehouse organized. We're looking for reliable team members who can handle physical work and maintain a safe, efficient warehouse environment.",
    posted: "2 days ago"
  },
  {
    id: 2,
    title: "Delivery Driver",
    company: "Fast Delivery Co",
    pay: "$18-20/hour",
    location: "North District",
    hours: "Flexible, 20-40 hrs/week",
    type: "Part-time",
    requirements: ["Valid driver's license", "Clean driving record", "Can lift 50 lbs"],
    description: "Deliver packages to customers, maintain delivery vehicle, provide excellent customer service. Perfect for those who enjoy being on the road and working independently.",
    posted: "1 week ago"
  },
  {
    id: 3,
    title: "Construction Laborer",
    company: "BuildRight Construction",
    pay: "$22/hour",
    location: "Various sites",
    hours: "Monday-Saturday, 6am-3pm",
    type: "Full-time",
    requirements: ["Previous construction experience", "Own basic tools", "Able to work outdoors", "Steel-toe boots required"],
    description: "Assist with framing, concrete work, general labor tasks on residential construction sites. Join a growing team working on exciting projects throughout the city.",
    posted: "3 days ago"
  },
  {
    id: 4,
    title: "Restaurant Cook",
    company: "The Local Grill",
    pay: "$15-17/hour + tips",
    location: "City Center",
    hours: "Evening shifts, Wed-Sun",
    type: "Part-time",
    requirements: ["1+ year cooking experience", "Knowledge of food safety", "Able to work fast-paced"],
    description: "Prepare dishes according to recipes, maintain clean kitchen, work with kitchen team during busy service. Great opportunity to grow your culinary skills.",
    posted: "5 days ago"
  },
  {
    id: 5,
    title: "Retail Sales Associate",
    company: "TechWorld",
    pay: "$14/hour + commission",
    location: "Shopping Mall",
    hours: "Part-time, weekends required",
    type: "Part-time",
    requirements: ["Customer service skills", "Tech-savvy", "Flexible schedule"],
    description: "Help customers find products, process sales, maintain store displays, meet sales goals. Perfect for tech enthusiasts who love helping people.",
    posted: "1 day ago"
  },
  {
    id: 6,
    title: "Janitorial Staff",
    company: "CleanPro Services",
    pay: "$13.50/hour",
    location: "Multiple locations",
    hours: "Night shift, 10pm-6am",
    type: "Full-time",
    requirements: ["Reliable", "Attention to detail", "Own transportation"],
    description: "Clean office buildings, empty trash, vacuum and mop floors, restock supplies. Consistent work with opportunities for advancement.",
    posted: "4 days ago"
  }
];

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredJobs = JOBS.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === 'all' || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    return matchesSearch && matchesLocation && matchesType;
  });

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
                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 pb-[21px]">My Applications</a>
                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900 pb-[21px]">Saved</a>
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
                JD
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by job title or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none"
              />
            </div>

            {/* Filters */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none cursor-pointer"
            >
              <option value="all">All Locations</option>
              <option value="downtown">Downtown</option>
              <option value="north">North District</option>
              <option value="city center">City Center</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-handshake-red focus:border-handshake-red outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{filteredJobs.length}</span> jobs found
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select className="text-sm border-0 bg-transparent text-gray-900 font-medium focus:ring-0 cursor-pointer">
                <option>Most Recent</option>
                <option>Highest Pay</option>
                <option>Closest Match</option>
              </select>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="bg-white rounded-lg border border-gray-200 hover:border-handshake-red hover:shadow-md transition-all cursor-pointer p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    {/* Company Logo Placeholder */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{job.company}</p>

                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.pay}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.location}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.type}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {job.requirements.slice(0, 3).map((req, idx) => (
                          <span key={idx} className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded">
                            {req}
                          </span>
                        ))}
                        {job.requirements.length > 3 && (
                          <span className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 rounded">
                            +{job.requirements.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <svg className="w-5 h-5 text-gray-400 hover:text-handshake-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                  <span className="text-xs text-gray-500">{job.posted}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedJob.title}</h2>
                  <p className="text-lg text-gray-600">{selectedJob.company}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-8 py-6 space-y-6">
              {/* Quick Info */}
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 font-medium rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {selectedJob.pay}
                </span>
                <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {selectedJob.location}
                </span>
                <span className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                  {selectedJob.type}
                </span>
              </div>

              {/* Schedule */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Schedule</h3>
                <p className="text-gray-700">{selectedJob.hours}</p>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">About the Role</h3>
                <p className="text-gray-700 leading-relaxed">{selectedJob.description}</p>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Requirements</h3>
                <ul className="space-y-2">
                  {selectedJob.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start text-gray-700">
                      <svg className="w-5 h-5 text-handshake-red mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-6 flex items-center gap-4">
              <button className="flex-1 bg-handshake-red hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition duration-200 shadow-sm hover:shadow">
                Apply Now
              </button>
              <button className="px-6 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition duration-200">
                Save for Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
