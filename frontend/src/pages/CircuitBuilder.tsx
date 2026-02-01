import React, { useState } from 'react';
import { simulateAPI } from '../api';
import './CircuitBuilder.css';

export const CircuitBuilder: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  // Demo circuit: one 10V source between n1 and ground, one resistor 1k between n1 and ground
  const demoCircuit = {
    nodeCount: 2, // nodes: 0 (gnd), 1
    resistors: [{ n1: 1, n2: 0, value: 1000 }],
    voltageSources: [{ nPlus: 1, nMinus: 0, value: 10 }],
  };

  const runDemo = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await simulateAPI.run(demoCircuit);
      setResult(res.data);
    } catch (err: any) {
      setResult({ error: err.response?.data || err.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="circuit-container">
      <div className="circuit-box">
        <h2>Circuit Builder (Demo)</h2>
        <p>This demo sends a small circuit to the backend simulator and shows voltages.</p>

        <div className="controls">
          <button onClick={runDemo} disabled={running}>
            {running ? 'Simulating...' : 'Run Demo Simulation'}
          </button>
        </div>

        {result && (
          <div className="sim-result">
            <h3>Simulation Result</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitBuilder;
