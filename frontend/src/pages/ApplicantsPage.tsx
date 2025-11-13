import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon, Clock } from "lucide-react";

interface ApplicantItem {
    id: string;
    user_id: string;
    job_listing_id: string;
    status: string;
    applied_at: string;
    score: number;
    profiles?: {
        id: string;
        first_name?: string;
        last_name?: string;
    };
}

const ApplicantsPage = () => {
    const navigate = useNavigate();
    const { jobId } = useParams<{ jobId: string }>();

    const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [companyName, setCompanyName] = useState<string>("Company");
    const [roleTitle, setRoleTitle] = useState<string>("Role");

    // Schedule form state
    const [selectedApplicant, setSelectedApplicant] = useState<ApplicantItem | null>(null);
    const [meetingTime, setMeetingTime] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            if (!jobId) return;
            try {
                const res = await fetch(`http://localhost:8000/api/applications/by-job/${jobId}`);
                if (res.ok) {
                    const data = await res.json();
                    setApplicants(data);
                }
                // Try to infer company and role from job_details
                const jobRes = await fetch(`http://localhost:8000/api/jobs/${jobId}`);
                if (jobRes.ok) {
                    const jobData = await jobRes.json();
                    setRoleTitle(jobData.title || "Role");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [jobId]);

    const openSchedule = (app: ApplicantItem) => {
        setSelectedApplicant(app);
        setMeetingTime("");
        setMessage("");
    };

    const generateRoomName = (applicantId: string) => {
        const ts = Date.now();
        return `${companyName}-${roleTitle}`.replace(/\s+/g, '-') + `-${jobId}-${applicantId}-${ts}`;
    };

    const submitSchedule = async () => {
        if (!selectedApplicant || !meetingTime) return;
        setSubmitting(true);
        try {
            const room = generateRoomName(selectedApplicant.user_id);
            const jitsiLink = `https://meet.jit.si/${encodeURIComponent(room)}`;
            const details = `${companyName} • ${roleTitle} • ${jitsiLink}`;
            const res = await fetch(`http://localhost:8000/api/schedule`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    application_user_id: selectedApplicant.user_id,
                    application_job_id: selectedApplicant.job_listing_id,
                    interview_time: new Date(meetingTime).toISOString(),
                    interview_details: details,
                }),
            });
            if (res.ok) {
                setMessage("Meeting scheduled and added to both calendars.");
                setSelectedApplicant(null);
            } else {
                setMessage("Failed to schedule meeting.");
            }
        } catch (e) {
            console.error(e);
            setMessage("Error scheduling meeting.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">Applicants</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="text-center text-gray-500">Loading applicants...</div>
                ) : applicants.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">No applicants yet.</div>
                ) : (
                    <div className="bg-white rounded-xl shadow border p-6">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead>
                                    <tr className="text-gray-600 text-sm">
                                        <th className="py-2 pr-4">Applicant</th>
                                        <th className="py-2 pr-4">Score</th>
                                        <th className="py-2 pr-4">Status</th>
                                        <th className="py-2 pr-4">Applied</th>
                                        <th className="py-2 pr-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applicants.map((a) => {
                                        const name = [a.profiles?.first_name, a.profiles?.last_name].filter(Boolean).join(' ') || a.user_id;
                                        return (
                                            <tr key={a.id} className="border-t">
                                                <td className="py-3 pr-4">{name}</td>
                                                <td className="py-3 pr-4">{a.score}</td>
                                                <td className="py-3 pr-4 capitalize">{a.status}</td>
                                                <td className="py-3 pr-4">{new Date(a.applied_at).toLocaleDateString()}</td>
                                                <td className="py-3 pr-4">
                                                    <button onClick={() => openSchedule(a)} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm inline-flex items-center gap-1">
                                                        <CalendarIcon className="w-4 h-4" /> Schedule
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedApplicant && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-4 border-b font-semibold">Schedule Interview</div>
                            <div className="p-4 space-y-3">
                                <div className="text-sm text-gray-600">Select date and time</div>
                                <div className="flex items-center gap-2 border rounded px-3 py-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <input
                                        type="datetime-local"
                                        value={meetingTime}
                                        onChange={(e) => setMeetingTime(e.target.value)}
                                        className="w-full outline-none"
                                    />
                                </div>
                                {message && <div className="text-sm text-gray-700">{message}</div>}
                            </div>
                            <div className="p-4 border-t flex justify-end gap-2">
                                <button onClick={() => setSelectedApplicant(null)} className="px-3 py-1.5 rounded border">Cancel</button>
                                <button onClick={submitSchedule} disabled={submitting || !meetingTime} className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50">
                                    {submitting ? "Scheduling..." : "Schedule"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ApplicantsPage;

