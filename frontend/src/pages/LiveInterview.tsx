import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const WS_BASE_URL = 'ws://127.0.0.1:8000';

interface LogEntry {
  line: string;
  timestamp: string;
  level: 'info' | 'error';
}

function LiveInterview() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<string>('connecting');
  const [statusMessage, setStatusMessage] = useState<string>('Connecting...');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Connect to WebSocket
  useEffect(() => {
    if (!jobId) {
      console.error('No job ID provided');
      return;
    }

    console.log(`[LiveInterview] Connecting to WebSocket for job: ${jobId}`);

    const ws = new WebSocket(`${WS_BASE_URL}/live-interview/ws/${jobId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[LiveInterview] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[LiveInterview] Message:', message);

        if (message.type === 'log') {
          // Add log entry
          setLogs(prev => [...prev, message.data]);
        } else if (message.type === 'status') {
          // Update status
          setStatus(message.data.status);
          setStatusMessage(message.data.message);

          if (message.data.job_title) {
            setJobTitle(message.data.job_title);
          }

          if (message.data.status === 'completed') {
            setIsCompleted(true);
          }
        } else if (message.type === 'error') {
          // Show error
          setStatus('error');
          setStatusMessage(message.data.message);
          setLogs(prev => [...prev, {
            line: `❌ ERROR: ${message.data.message}`,
            timestamp: new Date().toISOString(),
            level: 'error'
          }]);
        }
      } catch (err) {
        console.error('[LiveInterview] Error parsing message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[LiveInterview] WebSocket error:', error);
      setStatus('error');
      setStatusMessage('Connection error');
    };

    ws.onclose = () => {
      console.log('[LiveInterview] WebSocket closed');
      if (status !== 'completed') {
        setStatus('disconnected');
        setStatusMessage('Connection closed');
      }
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [jobId]);

  const getStatusColor = () => {
    switch (status) {
      case 'connecting': return 'bg-yellow-500';
      case 'starting': return 'bg-blue-500';
      case 'running': return 'bg-green-500 animate-pulse';
      case 'completed': return 'bg-green-600';
      case 'error': return 'bg-red-500';
      case 'disconnected': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="flex items-center space-x-4">
            <div className={`h-3 w-3 rounded-full ${getStatusColor()}`}></div>
            <div>
              <h1 className="text-2xl font-bold">AI Skills Interview</h1>
              {jobTitle && <p className="text-sm text-gray-400">{jobTitle}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Status</p>
            <p className="font-semibold">{statusMessage}</p>
          </div>
        </div>
      </div>

      {/* Terminal-like log viewer */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-black rounded-lg shadow-2xl overflow-hidden border border-gray-700">
          {/* Terminal header */}
          <div className="bg-gray-800 px-4 py-2 flex items-center space-x-2 border-b border-gray-700">
            <div className="flex space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-sm text-gray-400 ml-4">skill_interview.py</span>
          </div>

          {/* Log content */}
          <div className="p-4 h-[calc(100vh-250px)] overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 italic">Waiting for logs...</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${log.level === 'error' ? 'text-red-400' : 'text-green-400'}`}
                >
                  <span className="text-gray-600 text-xs mr-2">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="whitespace-pre-wrap">{log.line}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Bottom actions */}
        {isCompleted && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/home')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-colors"
            >
              Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveInterview;
