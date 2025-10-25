import { useState } from 'react'
import VideoInterview from './components/VideoInterview'
import './App.css'
import LandingPage from './pages/LandingPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {

  return (
    <BrowserRouter>

      {/* Here is where we are going to be calling all the pages
      this will be handled by the broswer router to be moved
      around by the routes, i guess the onclick will handle the 
      routes.
      */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
