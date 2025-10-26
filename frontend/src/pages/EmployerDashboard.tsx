import { useNavigate } from "react-router-dom";
import { Briefcase, Plus, Users, TrendingUp } from "lucide-react";

const EmployerDashboard = () => {
    const navigate = useNavigate();

    const stats = [
        { label: "Active Jobs", value: "10", icon: Briefcase, color: "text-blue-600" },
        { label: "Total Applicants", value: "10", icon: Users, color: "text-green-600" },
        { label: "Interviews Scheduled", value: "8", icon: TrendingUp, color: "text-purple-600" },
    ];

    const goHome = () => {
        navigate('/');
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        {/* Header */}
        <header className="bg-white border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center">
                    <span className="text-xl font-bold">J</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Jale Employer</h1>
                </div>
                <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Welcome back, Company Name</span>
                <button onClick={goHome}>Logout</button>
                </div>
            </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-border p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                    Find Your Next Great Hire
                </h2>
                <p className="text-muted-foreground text-lg">
                    Post jobs and connect with qualified candidates instantly
                </p>
                </div>
                <button 
                className="gap-2"
                onClick={() => navigate("/employer/create-job")}
                >
                <Plus className="w-5 h-5" />
                Post a New Job
                </button>
            </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat) => (
                <div
                key={stat.label}
                className="bg-white rounded-xl shadow-md border border-border p-6 hover:shadow-lg transition-shadow"
                >
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                    <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-12 h-12 ${stat.color}`} />
                </div>
                </div>
            ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
            <h3 className="text-xl font-semibold text-foreground mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                className="justify-start h-auto py-4 px-6"
                onClick={() => navigate("/employer/my-jobs")}
                >
                <Briefcase className="w-5 h-5 mr-3" />
                <div className="text-left">
                    <div className="font-semibold">Manage Jobs</div>
                    <div className="text-sm text-muted-foreground">View and edit your job postings</div>
                </div>
                </button>
                <button
                className="justify-start h-auto py-4 px-6"
                >
                <Users className="w-5 h-5 mr-3" />
                <div className="text-left">
                    <div className="font-semibold">View Applicants</div>
                    <div className="text-sm text-muted-foreground">Review candidate applications</div>
                </div>
                </button>
            </div>
            </div>
        </main>
        </div>
    );
};

export default EmployerDashboard;
