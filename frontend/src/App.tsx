import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InterviewPage from './pages/InterviewPage';
import CreateAccount from './pages/CreateAccount';
import LoginAccount from './pages/LoginAccount';
import Home from './pages/Home';
import Inbox from './pages/Inbox';
import './App.css';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/interview/:roomName" element={<InterviewPage />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/login" element={<LoginAccount />} />
        <Route path="/home" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
