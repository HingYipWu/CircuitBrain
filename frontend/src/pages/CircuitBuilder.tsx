import React, { useState, useRef } from 'react';
import { simulateAPI } from '../api';
import './CircuitBuilder.css';

// New data model: components are placed on the canvas with positions
type Component = {
  id: number;
  type: 'resistor' | 'voltage' | 'ground';
  x: number;
  y: number;
  value: number; // ohms or volts
};

type Wire = {
  id: number;
  fromCompId: number;
  toCompId: number;
  fromTerminal: 'in' | 'out'; // which terminal of the component
  toTerminal: 'in' | 'out';
};

export const CircuitBuilder: React.FC = () => {
  const [components, setComponents] = useState<Component[]>([
    { id: 0, type: 'resistor', x: 150, y: 100, value: 1000 },
    { id: 1, type: 'voltage', x: 350, y: 100, value: 10 },
    { id: 2, type: 'ground', x: 250, y: 200, value: 0 },
  ]);
  const [wires, setWires] = useState<Wire[]>([]);

  const [mode, setMode] = useState<'select' | 'resistor' | 'voltage' | 'ground' | 'wire'>('select');
  const [feedback, setFeedback] = useState<string>('Ready');
  const [wireStart, setWireStart] = useState<{ compId: number; terminal: 'in' | 'out' } | null>(null);
  const nextCompId = useRef(3);
  const nextWireId = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const getModeInstructions = (): string => {
    switch (mode) {
      case 'select':
        return 'Select a tool to begin';
      case 'resistor':
        return 'Click on canvas to place resistor';
      case 'voltage':
        return 'Click on canvas to place voltage source';
      case 'ground':
        return 'Click on canvas to place ground';
      case 'wire':
        return wireStart ? 'Click a terminal on another component' : 'Click a component terminal to start wire';
      default:
        return '';
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (mode === 'wire' || mode === 'select') return; // wire tool handled separately
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'resistor' || mode === 'voltage' || mode === 'ground') {
      const id = nextCompId.current++;
      let value = mode === 'resistor' ? 1000 : mode === 'voltage' ? 10 : 0;
      
      if (mode === 'resistor' || mode === 'voltage') {
        const valStr = prompt(`Enter ${mode === 'resistor' ? 'resistance (ohms)' : 'voltage (volts)'}:`, String(value));
        if (valStr !== null) {
          value = Number(valStr) || value;
        } else {
          return; // cancelled
        }
      }

      const comp: Component = { id, type: mode as 'resistor' | 'voltage' | 'ground', x, y, value };
      setComponents((s) => [...s, comp]);
      setFeedback(`Added ${mode} at (${Math.round(x)}, ${Math.round(y)})`);
      setTimeout(() => setFeedback('Ready'), 2000);
    }
  };

  const getComponentTerminals = (comp: Component): { in: { x: number; y: number }; out: { x: number; y: number } } => {
    const w = 40;
    const h = 24;
    return {
      in: { x: comp.x - w / 2, y: comp.y },
      out: { x: comp.x + w / 2, y: comp.y },
    };
  };

  const findComponentAtPos = (x: number, y: number): { compId: number; terminal: 'in' | 'out' } | null => {
    for (const comp of components) {
      const terminals = getComponentTerminals(comp);
      const inDist = Math.hypot(terminals.in.x - x, terminals.in.y - y);
      const outDist = Math.hypot(terminals.out.x - x, terminals.out.y - y);
      if (inDist < 10) return { compId: comp.id, terminal: 'in' };
      if (outDist < 10) return { compId: comp.id, terminal: 'out' };
    }
    return null;
  };

  const handleTerminalClick = (compId: number, terminal: 'in' | 'out', e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode !== 'wire') return;

    if (!wireStart) {
      setWireStart({ compId, terminal });
      setFeedback(`Wire started from component ${compId}`);
    } else {
      if (wireStart.compId === compId) {
        setFeedback('Cannot connect component to itself');
        setTimeout(() => setFeedback('Ready'), 2000);
        setWireStart(null);
        return;
      }

      const wire: Wire = {
        id: nextWireId.current++,
        fromCompId: wireStart.compId,
        fromTerminal: wireStart.terminal,
        toCompId: compId,
        toTerminal: terminal,
      };
      setWires((s) => [...s, wire]);
      setFeedback(`Added wire`);
      setTimeout(() => setFeedback('Ready'), 2000);
      setWireStart(null);
    }
  };

  const buildCircuitAndRun = async () => {
    if (components.length === 0) {
      setFeedback('Add components first');
      return;
    }

    // Convert positioned components to nodes and component values
    // For simplicity: each component gets a node, ground is node 0
    const groundComps = components.filter((c) => c.type === 'ground');
    const groundId = groundComps[0]?.id ?? components[0]?.id;

    const compMap = new Map<number, number>();
    compMap.set(groundId, 0);
    let nodeIdx = 1;
    for (const comp of components) {
      if (comp.id === groundId) continue;
      compMap.set(comp.id, nodeIdx++);
    }

    const resistors: any[] = [];
    const voltageSources: any[] = [];

    for (const comp of components) {
      if (comp.type === 'resistor') {
        resistors.push({
          n1: compMap.get(comp.id)!,
          n2: 0, // simplified: connect to ground
          value: comp.value,
        });
      } else if (comp.type === 'voltage') {
        voltageSources.push({
          nPlus: compMap.get(comp.id)!,
          nMinus: 0, // simplified: connect to ground
          value: comp.value,
        });
      }
    }

    const circuit = { nodeCount: compMap.size, resistors, voltageSources };
    try {
      const resp = await simulateAPI.run(circuit);
      setFeedback('Simulation complete');
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    }
  };

  const clearAll = () => {
    setComponents([]);
    setWires([]);
    nextCompId.current = 3;
    nextWireId.current = 0;
    setWireStart(null);
    setFeedback('Cleared all');
    setTimeout(() => setFeedback('Ready'), 2000);
  };



  return (
    <div className="cb-root">
      <div className="cb-sidebar">
        <h3>Tools</h3>
        <div className="mode-status">
          <div className="status-label">Mode: <strong>{mode.toUpperCase()}</strong></div>
          <div className="feedback">{feedback}</div>
          <div className="instructions">{getModeInstructions()}</div>
        </div>
        <hr />
        <div className={`tool ${mode === 'select' ? 'active' : ''}`} onClick={() => { setMode('select'); setFeedback('Select mode'); }}>
          Select
        </div>
        <div className={`tool ${mode === 'resistor' ? 'active' : ''}`} onClick={() => { setMode('resistor'); setFeedback('Click canvas to place resistor'); }}>
          Add Resistor
        </div>
        <div className={`tool ${mode === 'voltage' ? 'active' : ''}`} onClick={() => { setMode('voltage'); setFeedback('Click canvas to place voltage'); }}>
          Add Voltage
        </div>
        <div className={`tool ${mode === 'ground' ? 'active' : ''}`} onClick={() => { setMode('ground'); setFeedback('Click canvas to place ground'); }}>
          Add Ground
        </div>
        <div className={`tool ${mode === 'wire' ? 'active' : ''}`} onClick={() => { setMode('wire'); setFeedback('Click terminals to add wire'); setWireStart(null); }}>
          Add Wire
        </div>
        <hr />
        <button onClick={buildCircuitAndRun}>Run Simulation</button>
        <button onClick={clearAll} className="danger">
          Clear
        </button>
        <hr />
        <div className="legend">
          <div><span className="legend-resistor" /> Resistor</div>
          <div><span className="legend-voltage" /> Voltage</div>
          <div><span className="legend-ground" /> Ground</div>
        </div>
      </div>

      <div className="cb-canvas" onClick={handleCanvasClick}>
        <svg ref={svgRef} width="100%" height="100%">
          {/* wires */}
          {wires.map((wire) => {
            const fromComp = components.find((c) => c.id === wire.fromCompId);
            const toComp = components.find((c) => c.id === wire.toCompId);
            if (!fromComp || !toComp) return null;
            const fromTerminal = getComponentTerminals(fromComp)[wire.fromTerminal];
            const toTerminal = getComponentTerminals(toComp)[wire.toTerminal];
            return (
              <line
                key={`wire-${wire.id}`}
                x1={fromTerminal.x}
                y1={fromTerminal.y}
                x2={toTerminal.x}
                y2={toTerminal.y}
                stroke="#333"
                strokeWidth={2}
              />
            );
          })}

          {/* preview wire while drawing */}
          {wireStart && (() => {
            const startComp = components.find((c) => c.id === wireStart.compId);
            if (!startComp) return null;
            const startTerm = getComponentTerminals(startComp)[wireStart.terminal];
            return (
              <line x1={startTerm.x} y1={startTerm.y} x2={startTerm.x} y2={startTerm.y} stroke="#666" strokeWidth={1} strokeDasharray="4" />
            );
          })()}

          {/* components */}
          {components.map((comp) => {
            const terminals = getComponentTerminals(comp);
            const w = 40;
            const h = 24;
            return (
              <g key={comp.id}>
                {/* component body */}
                <rect x={comp.x - w / 2} y={comp.y - h / 2} width={w} height={h} fill="#fff" stroke="#333" strokeWidth={1} rx={4} />

                {/* terminals */}
                <circle
                  cx={terminals.in.x}
                  cy={terminals.in.y}
                  r={6}
                  fill={wireStart?.compId === comp.id && wireStart?.terminal === 'in' ? '#f39c12' : '#666'}
                  stroke="#000"
                  strokeWidth={1}
                  onClick={(e) => handleTerminalClick(comp.id, 'in', e)}
                  style={{ cursor: 'pointer' }}
                />
                <circle
                  cx={terminals.out.x}
                  cy={terminals.out.y}
                  r={6}
                  fill={wireStart?.compId === comp.id && wireStart?.terminal === 'out' ? '#f39c12' : '#666'}
                  stroke="#000"
                  strokeWidth={1}
                  onClick={(e) => handleTerminalClick(comp.id, 'out', e)}
                  style={{ cursor: 'pointer' }}
                />

                {/* component label and icon */}
                {comp.type === 'resistor' && (
                  <>
                    <text x={comp.x} y={comp.y + 4} fontSize={9} fontWeight="bold" fill="#000" textAnchor="middle" pointerEvents="none">
                      R
                    </text>
                    <text x={comp.x} y={comp.y + 14} fontSize={8} fill="#666" textAnchor="middle" pointerEvents="none">
                      {comp.value}Ω
                    </text>
                  </>
                )}
                {comp.type === 'voltage' && (
                  <>
                    <text x={comp.x} y={comp.y + 4} fontSize={9} fontWeight="bold" fill="#000" textAnchor="middle" pointerEvents="none">
                      V
                    </text>
                    <text x={comp.x} y={comp.y + 14} fontSize={8} fill="#666" textAnchor="middle" pointerEvents="none">
                      {comp.value}V
                    </text>
                  </>
                )}
                {comp.type === 'ground' && (
                  <>
                    <polygon points={`${comp.x},${comp.y - 8} ${comp.x - 6},${comp.y + 2} ${comp.x + 6},${comp.y + 2}`} fill="none" stroke="#000" strokeWidth={1} />
                    <line x1={comp.x - 5} y1={comp.y + 4} x2={comp.x + 5} y2={comp.y + 4} stroke="#000" strokeWidth={1} />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="cb-right">
        <h3>Circuit Info</h3>
        <div className="info-box">
          <p>Components: {components.length}</p>
          <p>Wires: {wires.length}</p>
        </div>
      </div>
    </div>
  );
};

export default CircuitBuilder;
