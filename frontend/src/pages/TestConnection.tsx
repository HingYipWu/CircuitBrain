import React, { useState, useEffect } from 'react';
import api from '../api';
import './TestConnection.css';

export const TestConnection: React.FC = () => {
  const [statusText, setStatusText] = useState<string>('Testing...');
  const [statusOk, setStatusOk] = useState<boolean | null>(null);

  useEffect(() => {
    const runCheck = async () => {
      try {
        const resp = await api.get('/test/health');
        setStatusText(`Connected — ${resp.status} ${resp.data?.status || ''}`);
        setStatusOk(true);
      } catch (err: any) {
        const code = err.response?.status ?? 'no-response';
        const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        setStatusText(`Failed — ${code} — ${msg}`);
        setStatusOk(false);
      }
    };
    runCheck();
  }, []);

  return (
    <div className="test-container">
      <div className="test-box">
        <h2>Backend Connectivity Test</h2>
        <div className={`status-badge ${statusOk === null ? 'yellow' : statusOk ? 'green' : 'red'}`}>
          {statusText}
        </div>
        <p>This performs one Axios GET to <code>/api/test/health</code> using the app's API client.</p>
      </div>
    </div>
  );
};
