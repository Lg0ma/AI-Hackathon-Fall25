import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InterviewPage from './pages/InterviewPage';
import InterviewSession from './pages/InterviewSession';
import CreateAccount from './pages/CreateAccount';
import LoginAccount from './pages/LoginAccount';
import QuestionnairePage from './pages/QuestionnairePage';
import Home from './pages/Home';
import Inbox from './pages/Inbox';
import JobDetailsPage from './pages/JobDetailsPage';
import EmployerDashboard from './pages/EmployerDashboard';
import CreateJobPosting from './pages/CreateJobPosting';
import ManageJobs from './pages/ManageJobs';
import './App.css';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/interview/:roomName" element={<InterviewPage />} />
        <Route path="/interview-session/:jobId" element={<InterviewSession />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/questionnaire" element={<QuestionnairePage />} />
        <Route path="/job/:employer_id" element={<JobDetailsPage />} />
        <Route path="/login" element={<LoginAccount />} />
        <Route path="/home" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/employer" element={<EmployerDashboard />} />
        <Route path='/employer/create-job' element={<CreateJobPosting />} />
        <Route path='/employer/my-jobs' element={<ManageJobs />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
