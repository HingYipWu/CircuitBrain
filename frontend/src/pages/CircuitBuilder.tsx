import React, { useState, useRef } from 'react';
import { simulateAPI } from '../api';
import './CircuitBuilder.css';

type NodeItem = { id: number; x: number; y: number; isGround?: boolean };
type CompItem = { id: number; type: 'resistor' | 'voltage'; n1: number; n2: number; value: number };

export const CircuitBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<NodeItem[]>([
    { id: 0, x: 150, y: 100, isGround: true },
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
  const nextNodeId = useRef(2);
  const nextCompId = useRef(2);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const addNodeAt = (x: number, y: number) => {
    const id = nextNodeId.current++;
    setNodes((s) => [...s, { id, x, y }]);
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
      } else if (selectedNode === id) {
        // ignore
      } else {
        const valStr = prompt('Enter value (' + (mode === 'resistor' ? 'ohms' : 'volts') + ')', mode === 'resistor' ? '1000' : '10');
        const val = valStr ? Number(valStr) : (mode === 'resistor' ? 1000 : 10);
        const comp = { id: nextCompId.current++, type: mode === 'resistor' ? 'resistor' : 'voltage', n1: selectedNode, n2: id, value: val } as CompItem;
        setComps((s) => [...s, comp]);
        setSelectedNode(null);
      }
    } else if (mode === 'ground') {
      setNodes((s) => s.map((n) => ({ ...n, isGround: n.id === id })));
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
  };

  return (
    <div className="cb-root">
      <div className="cb-sidebar">
        <h3>Tools</h3>
        <div className={`tool ${mode==='select'?'active':''}`} onClick={() => setMode('select')}>Select</div>
        <div className={`tool ${mode==='add-node'?'active':''}`} onClick={() => setMode('add-node')}>Add Node</div>
        <div className={`tool ${mode==='resistor'?'active':''}`} onClick={() => setMode('resistor')}>Add Resistor</div>
        <div className={`tool ${mode==='voltage'?'active':''}`} onClick={() => setMode('voltage')}>Add Voltage</div>
        <div className={`tool ${mode==='ground'?'active':''}`} onClick={() => setMode('ground')}>Set Ground</div>
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
          {/* connections */}
          {comps.map((c) => {
            const n1 = nodes.find(n => n.id === c.n1);
            const n2 = nodes.find(n => n.id === c.n2);
            if (!n1 || !n2) return null;
            return (
              <g key={c.id}>
                <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="#333" strokeWidth={2} />
                <text x={(n1.x + n2.x)/2} y={(n1.y + n2.y)/2 - 8} fontSize={12} textAnchor="middle">{c.type==='resistor'?`${c.value}Ω`:`${c.value}V`}</text>
              </g>
            );
          })}

          {/* nodes */}
          {nodes.map((n) => (
            <g key={n.id} onClick={(e) => handleNodeClick(n.id, e)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={10} fill={n.isGround ? '#ffa' : '#fff'} stroke="#000" />
              <text x={n.x} y={n.y + 4} fontSize={10} textAnchor="middle">{n.id}</text>
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
