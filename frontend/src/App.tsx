import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InterviewPage from './pages/InterviewPage';
import InterviewSession from './pages/InterviewSession';
import LiveInterview from './pages/LiveInterview';
import CreateAccount from './pages/CreateAccount';
import LoginAccount from './pages/LoginAccount';
import QuestionnairePage from './pages/QuestionnairePage';
import Home from './pages/Home';
import Inbox from './pages/Inbox';
import JobDetailsPage from './pages/JobDetailsPage';
import EmployerDashboard from './pages/EmployerDashboard';
import CreateJobPosting from './pages/CreateJobPosting';
import ManageJobs from './pages/ManageJobs';
import AIInterviewRoomPage from './pages/AIInterviewRoomPage';
import ResumePage from './pages/ResumePage';
import WelcomePage from './pages/WelcomePage'; // Import WelcomePage
import ApplicationsPage from './pages/ApplicationsPage'; // Import ApplicationsPage
import './App.css';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} /> {/* Public landing page */}
        <Route path="/welcome" element={<WelcomePage />} /> {/* Post-login welcome page */}
        <Route path="/applications" element={<ApplicationsPage />} /> {/* Applications page */}
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/interview/:roomName" element={<InterviewPage />} />
        <Route path="/interview-session/:jobId" element={<InterviewSession />} />
        <Route path="/live-interview/:jobId" element={<LiveInterview />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/questionnaire" element={<QuestionnairePage />} />
        <Route path="/job/:employer_id" element={<JobDetailsPage />} />
        <Route path="/login" element={<LoginAccount />} />
        <Route path="/home" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/employer" element={<EmployerDashboard />} />
        <Route path='/employer/create-job' element={<CreateJobPosting />} />
        <Route path='/employer/my-jobs' element={<ManageJobs />} />
        <Route path="/ai-interview-room" element={<AIInterviewRoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
