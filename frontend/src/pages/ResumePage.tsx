import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import ResumeQuestionRoom from '../components/ResumeQuestionRoom';

interface ResumeResponse {
  questionId: string;
  question: string;
  answer: string;
  category: string;
}

const ResumePage: React.FC = () => {
  const navigate = useNavigate();
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeResponse[]>([]);

  const handleStartInterview = () => {
    setIsInterviewStarted(true);
  };

  const handleInterviewComplete = async (responses: ResumeResponse[]) => {
    setResumeData(responses);
    setIsComplete(true);

    // Send data to backend to generate resume
    try {
      const formattedData = formatResumeData(responses);

      // Print JSON to console for debugging
      console.log('==================== RESUME DATA ====================');
      console.log('Raw responses:', responses);
      console.log('Formatted data for backend:', formattedData);
      console.log('JSON string:', JSON.stringify(formattedData, null, 2));
      console.log('====================================================');

      const response = await fetch('http://127.0.0.1:8000/resume/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate resume');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Resume generation error:', error);
      alert('Failed to generate resume. Please try again.');
    }
  };

  const formatResumeData = (responses: ResumeResponse[]) => {
    const data: any = {
      interview_responses: {
        contact_information: {},
        work_experience_job1: {},
        work_experience_job2: {},
        skills: {},
        education: {},
        certifications_detailed: {}
      }
    };

    responses.forEach(response => {
      const { questionId, answer, category } = response;

      // Map to the backend expected format
      if (category === 'contact') {
        data.interview_responses.contact_information[questionId + '_' + getCategoryField(questionId)] = answer;
      } else if (category.startsWith('work_job')) {
        const jobKey = category === 'work_job1' ? 'work_experience_job1' : 'work_experience_job2';
        data.interview_responses[jobKey][questionId + '_' + getCategoryField(questionId)] = answer;
      } else if (category === 'skills') {
        data.interview_responses.skills[questionId + '_' + getCategoryField(questionId)] = answer;
      } else if (category === 'education') {
        data.interview_responses.education[questionId + '_' + getCategoryField(questionId)] = answer;
      } else if (category === 'certifications') {
        data.interview_responses.certifications_detailed[questionId + '_' + getCategoryField(questionId)] = answer;
      }
    });

    return data;
  };

  const getCategoryField = (questionId: string): string => {
    const fieldMap: { [key: string]: string } = {
      // Contact Information
      'Q1': 'full_name',
      'Q2': 'job_title',
      'Q3': 'phone_number',
      'Q4': 'email',
      'Q5': 'location',
      // Work Experience - Job 1
      'Q6': 'company',
      'Q7': 'location',
      'Q8': 'title',
      'Q9': 'start_date',
      'Q10': 'end_date',
      'Q11': 'accomplishment_1',
      'Q12': 'accomplishment_2',
      'Q13': 'accomplishment_3',
      'Q14': 'accomplishment_4',
      // Work Experience - Job 2
      'Q15': 'company',
      'Q16': 'location',
      'Q17': 'title',
      'Q18': 'start_date',
      'Q19': 'end_date',
      'Q20': 'accomplishment_1',
      'Q21': 'accomplishment_2',
      'Q22': 'accomplishment_3',
      // Skills
      'Q30': 'technical_skills',
      'Q31': 'certifications_licenses',
      'Q32': 'core_competencies',
      // Education
      'Q34': 'institution',
      'Q35': 'location',
      'Q36': 'credential',
      'Q37': 'date',
      // Certifications
      'Q39': 'name',
      'Q40': 'organization',
      'Q41': 'date',
    };
    return fieldMap[questionId] || '';
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Resume Complete!</h1>
            <p className="text-lg text-gray-600">
              Your resume has been generated and downloaded.
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{resumeData.length}</div>
                <div className="text-sm text-gray-600">Questions Answered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">PDF</div>
                <div className="text-sm text-gray-600">Format</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setIsInterviewStarted(false);
                setIsComplete(false);
                setResumeData([]);
              }}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Another Resume
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isInterviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">AI Resume Builder</h1>
            <p className="text-lg text-gray-600 mb-6">
              Answer a series of questions using your voice, and we'll create a professional resume for you!
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">How it works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Listen to each question read aloud</li>
              <li>Record your answer using your microphone</li>
              <li>Review and confirm your responses</li>
              <li>Download your professional PDF resume</li>
            </ol>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Find a quiet space and speak clearly. The interview takes about 15-20 minutes.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
            <button
              onClick={handleStartInterview}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              Start Building Resume
              <FileText className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ResumeQuestionRoom onComplete={handleInterviewComplete} />
  );
};

export default ResumePage;
