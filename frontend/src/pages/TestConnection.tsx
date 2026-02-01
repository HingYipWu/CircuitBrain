import React, { useState, useEffect } from 'react';
import api from '../api';
import './TestConnection.css';

export const TestConnection: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Testing...');
  const [healthColor, setHealthColor] = useState<string>('yellow');
  const [echoMessage, setEchoMessage] = useState<string>('');
  const [echoResponse, setEchoResponse] = useState<string>('');
  const [echoLoading, setEchoLoading] = useState<boolean>(false);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [directStatus, setDirectStatus] = useState<string>('');
  const [axiosUrl, setAxiosUrl] = useState<string>('');

  useEffect(() => {
    // Display the API URL being used (from env and axios instance)
    const envUrl = import.meta.env.VITE_API_URL || '/api';
    setApiUrl(envUrl);
    try {
      // @ts-ignore
      const axiosBase = api.defaults?.baseURL || '';
      if (axiosBase) setApiUrl(axiosBase);
      if (axiosBase) setAxiosUrl(axiosBase.replace(/\/$/, '') + '/test/health');
    } catch (e) {
      // ignore
    }

    // Test health endpoint
    const testHealth = async () => {
      try {
        const response = await api.get('/test/health');
        setHealthStatus(`✅ Connected! Status: ${response.data.status}`);
        setHealthColor('green');
      } catch (error: any) {
        const status = error.response?.status;
        const data = error.response?.data;
        let msg = `❌ Connection failed: ${error.message}`;
        if (status) msg += ` (${status})`;
        if (data) msg += ` - ${JSON.stringify(data)}`;
        setHealthStatus(msg);
        setHealthColor('red');
      }
    };

    // Also try a direct fetch to the deployed backend to isolate baseURL/CORS problems
    const testDirect = async () => {
      const directUrl = 'https://circuit-brain.vercel.app/api/test/health';
      try {
        const r = await fetch(directUrl, { method: 'GET' });
        if (!r.ok) {
          setDirectStatus(`Direct fetch failed: ${r.status} ${r.statusText}`);
          return;
        }
        const data = await r.json();
        setDirectStatus(`Direct OK: ${data.status}`);
      } catch (err: any) {
        setDirectStatus(`Direct fetch error: ${err.message}`);
      }
    };

    testHealth();
    testDirect();
  }, []);

  const handleEcho = async (e: React.FormEvent) => {
    e.preventDefault();
    setEchoLoading(true);
    setEchoResponse('');

    try {
      const response = await api.post('/test/echo', { message: echoMessage });
      setEchoResponse(response.data.echo);
    } catch (error: any) {
      setEchoResponse(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setEchoLoading(false);
    }
  };

  return (
    <div className="test-container">
      <div className="test-box">
        <h2>Connection Test</h2>

        <div className="test-section">
          <h3>Backend Health Check</h3>
          <div className={`status-badge ${healthColor}`}>{healthStatus}</div>
          <p className="api-url">API URL: <code>{apiUrl}</code></p>
          <p className="api-url">Axios request URL: <code>{axiosUrl}</code></p>
          <p className="api-url">Direct fetch: <code>{directStatus}</code></p>
        </div>

        <div className="test-section">
          <h3>Echo Test</h3>
          <form onSubmit={handleEcho}>
            <div className="form-group">
              <label htmlFor="echo">Send a message to backend:</label>
              <input
                id="echo"
                type="text"
                value={echoMessage}
                onChange={(e) => setEchoMessage(e.target.value)}
                placeholder="Type something..."
              />
            </div>
            <button type="submit" disabled={echoLoading}>
              {echoLoading ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          {echoResponse && (
            <div className="echo-result">
              <p><strong>Backend Response:</strong></p>
              <code>{echoResponse}</code>
            </div>
          )}
        </div>

        <div className="test-info">
          <h4>What this tests:</h4>
          <ul>
            <li>✅ Frontend to Backend connectivity</li>
            <li>✅ CORS configuration</li>
            <li>✅ API endpoint responsiveness</li>
            <li>✅ Environment variable setup</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
