import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Job Platform</h1>
            <button className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose how you'd like to continue</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Whether you're looking for your next opportunity or searching for talent, we've got you covered
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Candidate Card */}
          <div
            onClick={() => navigate('/candidate')}
            className="group bg-white rounded-2xl border-2 border-gray-200 hover:border-handshake-red p-8 cursor-pointer transition-all duration-300 hover:shadow-xl"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-handshake-red transition-colors">
                <svg className="w-8 h-8 text-handshake-red group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">I'm looking for a job</h3>
              <p className="text-gray-600 leading-relaxed">
                Browse available positions, apply to jobs, and track your applications all in one place
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-700">
                <svg className="w-5 h-5 text-handshake-red mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Search from hundreds of job listings
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <svg className="w-5 h-5 text-handshake-red mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Filter by location, pay, and schedule
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <svg className="w-5 h-5 text-handshake-red mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Apply with one click
              </div>
            </div>

            <button className="w-full bg-handshake-red hover:bg-red-700 text-white font-semibold py-3.5 rounded-lg transition duration-200 group-hover:shadow-lg">
              Browse Jobs
              <svg className="w-5 h-5 inline-block ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>

          {/* Company Card */}
          <div
            onClick={() => navigate('/company')}
            className="group bg-white rounded-2xl border-2 border-gray-200 hover:border-handshake-red p-8 cursor-pointer transition-all duration-300 hover:shadow-xl"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-handshake-red transition-colors">
                <svg className="w-8 h-8 text-handshake-red group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">I'm hiring talent</h3>
              <p className="text-gray-600 leading-relaxed">
                Post job openings, manage applications, and find the perfect candidates for your team
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-700">
                <svg className="w-5 h-5 text-handshake-red mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Post unlimited job listings
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <svg className="w-5 h-5 text-handshake-red mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Review and manage applications
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <svg className="w-5 h-5 text-handshake-red mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Connect with qualified candidates
              </div>
            </div>

            <button className="w-full bg-handshake-red hover:bg-red-700 text-white font-semibold py-3.5 rounded-lg transition duration-200 group-hover:shadow-lg">
              Post a Job
              <svg className="w-5 h-5 inline-block ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
