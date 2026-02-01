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
  positiveTerminal?: 'in' | 'out'; // which terminal is positive (default 'out')
};

type Wire = {
  id: number;
  fromCompId: number;
  toCompId: number;
  fromTerminal: 'in' | 'out'; // which terminal of the component
  toTerminal: 'in' | 'out';
};

type ComponentResult = {
  voltage: number;
  current: number;
  resistance: number;
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
  const [draggedCompId, setDraggedCompId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedCompIds, setSelectedCompIds] = useState<Set<number>>(new Set());
  const [contextMenuComp, setContextMenuComp] = useState<number | null>(null);
  const [simResults, setSimResults] = useState<Record<string, ComponentResult> | null>(null);
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

  const handleComponentMouseDown = (compId: number, e: React.MouseEvent) => {
    if (mode !== 'select') return;
    e.stopPropagation();
    
    // Toggle selection with Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
      setSelectedCompIds((prev) => {
        const next = new Set(prev);
        if (next.has(compId)) {
          next.delete(compId);
        } else {
          next.add(compId);
        }
        return next;
      });
      return;
    }
    
    // Single click selects only this component
    if (!selectedCompIds.has(compId)) {
      setSelectedCompIds(new Set([compId]));
    }
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;
    
    const offsetX = e.clientX - rect.left - comp.x;
    const offsetY = e.clientY - rect.top - comp.y;
    setDraggedCompId(compId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedCompId === null) return;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    
    // If dragging a selected component, move all selected components
    const toMove = selectedCompIds.has(draggedCompId) ? selectedCompIds : new Set([draggedCompId]);
    const draggedComp = components.find((c) => c.id === draggedCompId);
    if (!draggedComp) return;
    
    const deltaX = newX - draggedComp.x;
    const deltaY = newY - draggedComp.y;
    
    setComponents((comps) =>
      comps.map((c) => {
        if (toMove.has(c.id)) {
          return { ...c, x: c.x + deltaX, y: c.y + deltaY };
        }
        return c;
      })
    );
  };

  const handleMouseUp = () => {
    if (draggedCompId !== null) {
      setFeedback('Component moved');
      setTimeout(() => setFeedback('Ready'), 1500);
    }
    setDraggedCompId(null);
  };

  const deleteSelected = () => {
    if (selectedCompIds.size === 0) return;
    
    setComponents((comps) => comps.filter((c) => !selectedCompIds.has(c.id)));
    setWires((ws) =>
      ws.filter((w) => !selectedCompIds.has(w.fromCompId) && !selectedCompIds.has(w.toCompId))
    );
    setFeedback(`Deleted ${selectedCompIds.size} component(s)`);
    setSelectedCompIds(new Set());
    setTimeout(() => setFeedback('Ready'), 1500);
  };

  const togglePolarity = (compId: number) => {
    setComponents((comps) =>
      comps.map((c) => {
        if (c.id === compId && (c.type === 'voltage' || c.type === 'resistor')) {
          const currentPos = c.positiveTerminal ?? 'out';
          return { ...c, positiveTerminal: currentPos === 'in' ? 'out' : 'in' };
        }
        return c;
      })
    );
    setFeedback('Polarity flipped');
    setTimeout(() => setFeedback('Ready'), 1500);
  };

  // Keyboard listener for Delete key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompIds]);

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

    setFeedback('Running simulation...');

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
    const resistorMap: Record<string, any> = {};
    const voltageSourceMap: Record<string, any> = {};

    for (const comp of components) {
      if (comp.type === 'resistor') {
        const n1 = compMap.get(comp.id)!;
        const n2 = 0;
        resistors.push({ n1, n2, value: comp.value });
        resistorMap[`r${comp.id}`] = { compId: comp.id, n1, n2, value: comp.value };
      } else if (comp.type === 'voltage') {
        const nPlus = compMap.get(comp.id)!;
        const nMinus = 0;
        voltageSources.push({ nPlus, nMinus, value: comp.value });
        voltageSourceMap[`v${comp.id}`] = { compId: comp.id, nPlus, nMinus, value: comp.value };
      }
    }

    const circuit = { nodeCount: compMap.size, resistors, voltageSources, resistorMap, voltageSourceMap };
    console.log('Circuit payload:', circuit);
    
    try {
      const resp = await simulateAPI.run(circuit);
      console.log('Simulation response:', resp.data);
      setSimResults(resp.data.componentResults || {});
      setFeedback('✓ Simulation complete');
      setTimeout(() => setFeedback('Ready'), 2000);
    } catch (err: any) {
      console.error('Simulation error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Unknown error';
      setFeedback(`✗ Error: ${errMsg}`);
      setSimResults(null);
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
        {selectedCompIds.size === 1 && (() => {
          const comp = components.find((c) => c.id === Array.from(selectedCompIds)[0]);
          return (comp?.type === 'voltage' || comp?.type === 'resistor') ? (
            <button onClick={() => togglePolarity(Array.from(selectedCompIds)[0])} className="secondary">
              Flip Polarity
            </button>
          ) : null;
        })()}
        <button onClick={deleteSelected} className="danger" disabled={selectedCompIds.size === 0}>
          Delete Selected ({selectedCompIds.size})
        </button>
        <button onClick={clearAll} className="danger">
          Clear All
        </button>
        <hr />
        <div className="legend">
          <div><span className="legend-resistor" /> Resistor</div>
          <div><span className="legend-voltage" /> Voltage</div>
          <div><span className="legend-ground" /> Ground</div>
        </div>
      </div>

      <div className="cb-canvas" onClick={handleCanvasClick} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
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
            const isDragging = draggedCompId === comp.id;
            const isSelected = selectedCompIds.has(comp.id);
            return (
              <g key={comp.id} onMouseDown={(e) => handleComponentMouseDown(comp.id, e)} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
                {/* component body */}
                <rect x={comp.x - w / 2} y={comp.y - h / 2} width={w} height={h} fill={isSelected ? '#e6f7ff' : isDragging ? '#fff9e6' : '#fff'} stroke={isSelected ? '#1890ff' : isDragging ? '#faad14' : '#333'} strokeWidth={isSelected ? 2 : isDragging ? 2 : 1} rx={4} />

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
                    {/* Polarity labels */}
                    <text
                      x={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.in.x : terminals.out.x}
                      y={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.in.y - 10 : terminals.out.y - 10}
                      fontSize={10}
                      fontWeight="bold"
                      fill="#d9534f"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      +
                    </text>
                    <text
                      x={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.out.x : terminals.in.x}
                      y={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.out.y - 10 : terminals.in.y - 10}
                      fontSize={10}
                      fontWeight="bold"
                      fill="#5cb85c"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      −
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
                    {/* Polarity labels */}
                    <text
                      x={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.in.x : terminals.out.x}
                      y={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.in.y - 10 : terminals.out.y - 10}
                      fontSize={10}
                      fontWeight="bold"
                      fill="#d9534f"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      +
                    </text>
                    <text
                      x={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.out.x : terminals.in.x}
                      y={(comp.positiveTerminal ?? 'out') === 'in' ? terminals.out.y - 10 : terminals.in.y - 10}
                      fontSize={10}
                      fontWeight="bold"
                      fill="#5cb85c"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      −
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
        <h3 style={{ color: '#000' }}>Circuit Info</h3>
        <div className="info-box">
          <p style={{ color: '#000', margin: '4px 0' }}><strong>Components:</strong> {components.length}</p>
          <p style={{ color: '#000', margin: '4px 0' }}><strong>Wires:</strong> {wires.length}</p>
        </div>
        
        {/* Component Details Section */}
        {selectedCompIds.size === 1 && (() => {
          const compId = Array.from(selectedCompIds)[0];
          const comp = components.find((c) => c.id === compId);
          if (!comp) return null;
          
          const typeLabel = comp.type === 'resistor' ? 'Resistor' : comp.type === 'voltage' ? 'Voltage Source' : 'Ground';
          const valueLabel = comp.type === 'resistor' ? `${comp.value} Ω` : comp.type === 'voltage' ? `${comp.value} V` : 'Reference';
          
          return (
            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f0f5ff', borderRadius: '4px', border: '1px solid #b3d8ff' }}>
              <h4 style={{ color: '#000', marginBottom: '8px', marginTop: '0' }}>
                {typeLabel} (ID: {compId})
              </h4>
              <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                <strong>Value:</strong> {valueLabel}
              </p>
              <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                <strong>Position:</strong> ({Math.round(comp.x)}, {Math.round(comp.y)})
              </p>
              {(comp.type === 'resistor' || comp.type === 'voltage') && (
                <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                  <strong>Polarity:</strong> {comp.positiveTerminal === 'in' ? 'Inverted' : 'Normal'}
                </p>
              )}
            </div>
          );
        })()}

        {/* Simulation Results Section */}
        {simResults && Object.keys(simResults).length > 0 && (
          <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
            <h4 style={{ color: '#000', marginBottom: '8px', marginTop: '0' }}>Simulation Results</h4>
            
            {selectedCompIds.size === 1 && (() => {
              const compId = Array.from(selectedCompIds)[0];
              const comp = components.find((c) => c.id === compId);
              if (!comp) return null;
              
              const resultKey = comp.type === 'resistor' ? `resistor_${compId}` : comp.type === 'voltage' ? `voltage_${compId}` : null;
              const result = resultKey ? simResults[resultKey] : null;
              
              return result ? (
                <div>
                  <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                    <strong>Voltage:</strong> {result.voltage.toFixed(4)} V
                  </p>
                  <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                    <strong>Current:</strong> {result.current.toFixed(6)} A
                  </p>
                  <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                    <strong>Current (mA):</strong> {(result.current * 1000).toFixed(4)} mA
                  </p>
                  <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                    <strong>Resistance:</strong> {result.resistance.toFixed(2)} Ω
                  </p>
                  <p style={{ color: '#000', margin: '4px 0', fontSize: '12px' }}>
                    <strong>Power:</strong> {(result.voltage * result.current).toFixed(6)} W
                  </p>
                </div>
              ) : (
                <p style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                  No simulation data for selected component
                </p>
              );
            })()}
            
            {selectedCompIds.size === 0 && (
              <div>
                <p style={{ color: '#000', margin: '4px 0', fontSize: '11px', fontWeight: 'bold' }}>All Components:</p>
                {Array.from(Object.entries(simResults)).map(([key, result]) => (
                  <div key={key} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #b3d8ff' }}>
                    <p style={{ color: '#000', margin: '2px 0', fontSize: '11px' }}>
                      <strong>{key.replace(/_/g, ' ').toUpperCase()}:</strong>
                    </p>
                    <p style={{ color: '#666', margin: '2px 0', fontSize: '10px' }}>
                      V: {result.voltage.toFixed(4)}V | I: {(result.current * 1000).toFixed(3)}mA | R: {result.resistance.toFixed(2)}Ω
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitBuilder;
