import React, { useState, useRef } from 'react';
import { simulateAPI } from '../api';
import './CircuitBuilder.css';

type NodeItem = { id: number; x: number; y: number; isGround?: boolean };
type CompItem = { id: number; type: 'resistor' | 'voltage'; n1: number; n2: number; value: number };

// Helper: Draw resistor zigzag between two points
const drawResistor = (x1: number, y1: number, x2: number, y2: number): string => {
  const zigWidth = 8;
  const zigHeight = 40;
  const steps = 5;
  const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  let path = `M ${x1} ${y1}`;
  const segLen = (dist - zigHeight) / 2;
  const endX = x1 + segLen * Math.cos(angle);
  const endY = y1 + segLen * Math.sin(angle);
  
  path += ` L ${endX} ${endY}`;
  
  const perpX = Math.cos(angle + Math.PI / 2);
  const perpY = Math.sin(angle + Math.PI / 2);
  let zigX = endX;
  let zigY = endY;
  
  for (let i = 0; i < steps; i++) {
    zigX += (zigHeight / steps) * Math.cos(angle);
    zigY += (zigHeight / steps) * Math.sin(angle);
    const offset = i % 2 === 0 ? zigWidth : -zigWidth;
    path += ` L ${zigX + offset * perpX} ${zigY + offset * perpY}`;
  }
  
  path += ` L ${x2} ${y2}`;
  return path;
};

export const CircuitBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<NodeItem[]>([
    { id: 0, x: 150, y: 150, isGround: true },
    { id: 1, x: 350, y: 100 },
  ]);
  const [comps, setComps] = useState<CompItem[]>([
    { id: 0, type: 'resistor', n1: 1, n2: 0, value: 1000 },
    { id: 1, type: 'voltage', n1: 1, n2: 0, value: 10 },
  ]);

  const [mode, setMode] = useState<'select' | 'add-node' | 'resistor' | 'voltage' | 'ground' >('select');
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<string>('Ready');
  const nextNodeId = useRef(2);
  const nextCompId = useRef(2);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const addNodeAt = (x: number, y: number) => {
    const id = nextNodeId.current++;
    setNodes((s) => [...s, { id, x, y }]);
    setFeedback(`Added node ${id}`);
    setTimeout(() => setFeedback('Ready'), 2000);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'add-node') {
      addNodeAt(x, y);
      return;
    }
  };

  const findNodeAtPos = (x: number, y: number) => {
    return nodes.find((n) => Math.hypot(n.x - x, n.y - y) < 12)?.id ?? null;
  };

  const handleNodeClick = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (mode === 'resistor' || mode === 'voltage') {
      if (selectedNode == null) {
        setSelectedNode(id);
        setFeedback(`Selected node ${id}. Click another node to connect.`);
      } else if (selectedNode === id) {
        setFeedback('Cannot connect node to itself');
        setTimeout(() => setFeedback('Ready'), 2000);
      } else {
        const valStr = prompt('Enter value (' + (mode === 'resistor' ? 'ohms' : 'volts') + ')', mode === 'resistor' ? '1000' : '10');
        if (valStr !== null) {
          const val = Number(valStr) || (mode === 'resistor' ? 1000 : 10);
          const comp = { id: nextCompId.current++, type: mode === 'resistor' ? 'resistor' : 'voltage', n1: selectedNode, n2: id, value: val } as CompItem;
          setComps((s) => [...s, comp]);
          setFeedback(`Added ${mode} (${val}${mode === 'resistor' ? 'Ω' : 'V'}) between nodes ${selectedNode} and ${id}`);
          setTimeout(() => setFeedback('Ready'), 2000);
        }
        setSelectedNode(null);
      }
    } else if (mode === 'ground') {
      setNodes((s) => s.map((n) => ({ ...n, isGround: n.id === id })));
      setFeedback(`Node ${id} set as ground`);
      setTimeout(() => setFeedback('Ready'), 2000);
    }
  };

  const buildCircuitAndRun = async () => {
    if (nodes.length === 0) return;
    // choose ground node
    const groundNode = nodes.find((n) => n.isGround)?.id ?? nodes[0].id;
    // mapping: ground -> 0, others -> 1..N-1
    const map = new Map<number, number>();
    map.set(groundNode, 0);
    let idx = 1;
    for (const n of nodes) {
      if (n.id === groundNode) continue;
      map.set(n.id, idx++);
    }

    const resistors = comps.filter(c => c.type === 'resistor').map(c => ({ n1: map.get(c.n1)!, n2: map.get(c.n2)!, value: c.value }));
    const voltageSources = comps.filter(c => c.type === 'voltage').map(c => ({ nPlus: map.get(c.n1)!, nMinus: map.get(c.n2)!, value: c.value }));

    const circuit = { nodeCount: map.size, resistors, voltageSources };
    setRunning(true);
    setResult(null);
    try {
      const resp = await simulateAPI.run(circuit);
      setResult(resp.data);
    } catch (err: any) {
      setResult({ error: err.response?.data || err.message });
    } finally {
      setRunning(false);
    }
  };

  const clearAll = () => {
    setNodes([]);
    setComps([]);
    nextNodeId.current = 0;
    nextCompId.current = 0;
    setSelectedNode(null);
    setFeedback('Cleared all');
    setTimeout(() => setFeedback('Ready'), 2000);
  };

  return (
    <div className="cb-root">
      <div className="cb-sidebar">
        <h3>Tools</h3>
        <div className="mode-status">
          <div className="status-label">Mode: <strong>{mode.toUpperCase().replace('-', ' ')}</strong></div>
          <div className="feedback">{feedback}</div>
          <div className="instructions">
            {mode === 'select' && 'Select a tool above'}
            {mode === 'add-node' && 'Click on canvas to add nodes'}
            {mode === 'resistor' && 'Click two nodes to add a resistor (enter ohms when prompted)'}
            {mode === 'voltage' && 'Click two nodes to add a voltage source (enter volts when prompted)'}
            {mode === 'ground' && 'Click a node to set it as ground'}
          </div>
        </div>
        <hr />
        <div className={`tool ${mode==='select'?'active':''}`} onClick={() => { setMode('select'); setFeedback('Select mode active'); }}>Select</div>
        <div className={`tool ${mode==='add-node'?'active':''}`} onClick={() => { setMode('add-node'); setFeedback('Click canvas to add nodes'); }}>Add Node</div>
        <div className={`tool ${mode==='resistor'?'active':''}`} onClick={() => { setMode('resistor'); setFeedback('Click two nodes for resistor'); }}>Add Resistor</div>
        <div className={`tool ${mode==='voltage'?'active':''}`} onClick={() => { setMode('voltage'); setFeedback('Click two nodes for voltage'); }}>Add Voltage</div>
        <div className={`tool ${mode==='ground'?'active':''}`} onClick={() => { setMode('ground'); setFeedback('Click node to set ground'); }}>Set Ground</div>
        <hr />
        <button onClick={buildCircuitAndRun} disabled={running}>{running ? 'Running...' : 'Run Simulation'}</button>
        <button onClick={clearAll} className="danger">Clear</button>
        <hr />
        <div className="legend">
          <div><span className="legend-resistor"/> Resistor</div>
          <div><span className="legend-voltage"/> Voltage Source</div>
        </div>
      </div>

      <div className="cb-canvas" onClick={handleCanvasClick}>
        <svg ref={svgRef} width="100%" height="100%">
          <defs>
            <marker id="wire-end" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0, 5 2.5, 0 5" fill="#333" />
            </marker>
          </defs>

          {/* wires connecting nodes */}
          {comps.map((c) => {
            const n1 = nodes.find(n => n.id === c.n1);
            const n2 = nodes.find(n => n.id === c.n2);
            if (!n1 || !n2) return null;
            return (
              <g key={`wire-${c.id}`}>
                {/* left wire from n1 to component */}
                <line
                  x1={n1.x}
                  y1={n1.y}
                  x2={(n1.x + n2.x) / 2 - 30}
                  y2={n1.y}
                  stroke="#333"
                  strokeWidth={2}
                />
                {/* horizontal segment */}
                <line
                  x1={(n1.x + n2.x) / 2 - 30}
                  y1={n1.y}
                  x2={(n1.x + n2.x) / 2 - 30}
                  y2={(n1.y + n2.y) / 2}
                  stroke="#333"
                  strokeWidth={2}
                />
                {/* component to right wire */}
                <line
                  x1={(n1.x + n2.x) / 2 + 30}
                  y1={(n1.y + n2.y) / 2}
                  x2={(n1.x + n2.x) / 2 + 30}
                  y2={n2.y}
                  stroke="#333"
                  strokeWidth={2}
                />
                <line
                  x1={(n1.x + n2.x) / 2 + 30}
                  y1={n2.y}
                  x2={n2.x}
                  y2={n2.y}
                  stroke="#333"
                  strokeWidth={2}
                />

                {/* component symbol */}
                {c.type === 'resistor' && (
                  <g>
                    <path
                      d={`M ${(n1.x + n2.x) / 2 - 30} ${(n1.y + n2.y) / 2} 
                         Q ${(n1.x + n2.x) / 2 - 20} ${(n1.y + n2.y) / 2 - 8} 
                           ${(n1.x + n2.x) / 2 - 10} ${(n1.y + n2.y) / 2} 
                         Q ${(n1.x + n2.x) / 2} ${(n1.y + n2.y) / 2 + 8} 
                           ${(n1.x + n2.x) / 2 + 10} ${(n1.y + n2.y) / 2} 
                         Q ${(n1.x + n2.x) / 2 + 20} ${(n1.y + n2.y) / 2 - 8} 
                           ${(n1.x + n2.x) / 2 + 30} ${(n1.y + n2.y) / 2}`}
                      fill="none"
                      stroke="#d9534f"
                      strokeWidth={3}
                    />
                    <text
                      x={(n1.x + n2.x) / 2}
                      y={(n1.y + n2.y) / 2 - 18}
                      fontSize={11}
                      fontWeight="bold"
                      fill="#000"
                      textAnchor="middle"
                    >
                      {c.value}Ω
                    </text>
                  </g>
                )}

                {c.type === 'voltage' && (
                  <g>
                    <circle
                      cx={(n1.x + n2.x) / 2}
                      cy={(n1.y + n2.y) / 2}
                      r={14}
                      fill="#fff"
                      stroke="#5cb85c"
                      strokeWidth={2}
                    />
                    <text
                      x={(n1.x + n2.x) / 2 - 5}
                      y={(n1.y + n2.y) / 2 + 5}
                      fontSize={9}
                      fontWeight="bold"
                      fill="#000"
                    >
                      +
                    </text>
                    <text
                      x={(n1.x + n2.x) / 2 + 5}
                      y={(n1.y + n2.y) / 2 + 5}
                      fontSize={9}
                      fontWeight="bold"
                      fill="#000"
                    >
                      −
                    </text>
                    <text
                      x={(n1.x + n2.x) / 2}
                      y={(n1.y + n2.y) / 2 - 20}
                      fontSize={11}
                      fontWeight="bold"
                      fill="#000"
                      textAnchor="middle"
                    >
                      {c.value}V
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ground symbols at ground nodes */}
          {nodes.map((n) => {
            if (!n.isGround) return null;
            return (
              <g key={`gnd-${n.id}`}>
                {/* ground triangle */}
                <polygon
                  points={`${n.x},${n.y + 15} ${n.x - 12},${n.y + 25} ${n.x + 12},${n.y + 25}`}
                  fill="none"
                  stroke="#000"
                  strokeWidth={2}
                />
                {/* ground lines */}
                <line x1={n.x - 8} y1={n.y + 27} x2={n.x + 8} y2={n.y + 27} stroke="#000" strokeWidth={2} />
                <line x1={n.x - 5} y1={n.y + 31} x2={n.x + 5} y2={n.y + 31} stroke="#000" strokeWidth={2} />
              </g>
            );
          })}

          {/* node circles (on top) */}
          {nodes.map((n) => (
            <g key={n.id} onClick={(e) => handleNodeClick(n.id, e)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={12} fill={n.isGround ? '#ffb300' : '#1890ff'} stroke="#000" strokeWidth={2} />
              <text x={n.x} y={n.y + 5} fontSize={11} fontWeight="bold" fill="#fff" textAnchor="middle" pointerEvents="none">
                {n.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="cb-right">
        <h3>Simulation Result</h3>
        {result ? <pre className="result-box">{JSON.stringify(result, null, 2)}</pre> : <div className="muted">No result yet</div>}
      </div>
    </div>
  );
};

export default CircuitBuilder;
