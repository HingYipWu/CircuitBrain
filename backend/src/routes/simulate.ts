import { Router, Request, Response } from 'express';

const router = Router();

// Simple MNA solver for resistors and independent voltage sources
interface Resistor {
  n1: number;
  n2: number;
  value: number; // ohms
}

interface VoltageSource {
  nPlus: number;
  nMinus: number;
  value: number; // volts
}

interface CircuitPayload {
  nodeCount: number; // include ground as node 0
  resistors?: Resistor[];
  voltageSources?: VoltageSource[];
}

// Helper: solve linear system Ax = b via Gaussian elimination with partial pivoting
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Create augmented matrix
  const M: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    M[i] = A[i].slice();
    M[i].push(b[i]);
  }

  for (let k = 0; k < n; k++) {
    // Partial pivot
    let maxRow = k;
    let maxVal = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const val = Math.abs(M[i][k]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = i;
      }
    }
    if (maxVal === 0) return null; // singular
    if (maxRow !== k) {
      const tmp = M[k];
      M[k] = M[maxRow];
      M[maxRow] = tmp;
    }

    // Normalize and eliminate
    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) {
        M[i][j] -= factor * M[k][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

// POST /api/simulate
router.post('/', (req: Request<any, any, CircuitPayload>, res: Response) => {
  try {
    const payload = req.body;
    const N = Math.max(0, (payload.nodeCount || 1) - 1); // number of non-ground nodes
    const resistors = payload.resistors || [];
    const vsources = payload.voltageSources || [];

    const M = vsources.length;
    const S = N + M;

    // Build A matrix SxS and b vector
    const A: number[][] = Array.from({ length: S }, () => Array.from({ length: S }, () => 0));
    const b: number[] = Array.from({ length: S }, () => 0);

    // Stamp resistors
    for (const r of resistors) {
      const n1 = r.n1;
      const n2 = r.n2;
      const g = 1 / r.value;
      if (n1 !== 0) {
        A[n1 - 1][n1 - 1] += g;
      }
      if (n2 !== 0) {
        A[n2 - 1][n2 - 1] += g;
      }
      if (n1 !== 0 && n2 !== 0) {
        A[n1 - 1][n2 - 1] -= g;
        A[n2 - 1][n1 - 1] -= g;
      }
    }

    // Stamp voltage sources (MNA)
    for (let k = 0; k < vsources.length; k++) {
      const vs = vsources[k];
      const row = N + k;
      // for node plus
      if (vs.nPlus !== 0) {
        A[vs.nPlus - 1][row] += 1;
        A[row][vs.nPlus - 1] += 1;
      }
      if (vs.nMinus !== 0) {
        A[vs.nMinus - 1][row] -= 1;
        A[row][vs.nMinus - 1] -= 1;
      }
      b[row] = vs.value;
    }

    // Solve
    const x = solveLinearSystem(A, b);
    if (!x) return res.status(500).json({ error: 'Singular matrix / cannot solve' });

    // Prepare result: node voltages and source currents
    const voltages: Record<string, number> = {};
    for (let i = 0; i < N; i++) {
      voltages[`n${i + 1}`] = x[i];
    }
    // ground
    voltages['n0'] = 0;

    const sourceCurrents: Record<string, number> = {};
    for (let k = 0; k < M; k++) {
      sourceCurrents[`i_vs${k}`] = x[N + k];
    }

    res.json({ voltages, sourceCurrents });
  } catch (error) {
    res.status(500).json({ error: 'Simulation failed', details: String(error) });
  }
});

export default router;
