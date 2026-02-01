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

  useEffect(() => {
    // Display the API URL being used
    const url = import.meta.env.VITE_API_URL || '/api';
    setApiUrl(url);

    // Test health endpoint
    const testHealth = async () => {
      try {
        const response = await api.get('/test/health');
        setHealthStatus(`✅ Connected! Status: ${response.data.status}`);
        setHealthColor('green');
      } catch (error: any) {
        setHealthStatus(`❌ Connection failed: ${error.message}`);
        setHealthColor('red');
      }
    };

    testHealth();
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
