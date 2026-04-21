import { useState, useCallback, useEffect } from 'react';
import FleetMap from './components/FleetMap.jsx';
import OrderPanel from './components/OrderPanel.jsx';
import ThreeScene from './components/ThreeScene.jsx';

const API_URL = 'http://localhost:8000';

const MOCK_ORDERS = [
  { id: 'A1', lat: 12.9716, lng: 77.5946, weight: 5, priority: 8 },
  { id: 'A2', lat: 12.9352, lng: 77.6245, weight: 12, priority: 5 },
  { id: 'A3', lat: 12.9698, lng: 77.75, weight: 8, priority: 9 },
  { id: 'A4', lat: 13.0358, lng: 77.597, weight: 15, priority: 3 },
  { id: 'A5', lat: 12.9141, lng: 77.6411, weight: 7, priority: 7 },
  { id: 'A6', lat: 13.0827, lng: 77.5877, weight: 10, priority: 6 },
  { id: 'A7', lat: 12.9611, lng: 77.5388, weight: 4, priority: 10 },
  { id: 'A8', lat: 12.9063, lng: 77.5857, weight: 20, priority: 2 },
  { id: 'A9', lat: 13.0105, lng: 77.5519, weight: 6, priority: 4 },
  { id: 'A10', lat: 12.9783, lng: 77.6408, weight: 9, priority: 1 },
];

export default function App() {
  const [orders] = useState(MOCK_ORDERS);
  const [vans, setVans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [optimised, setOptimised] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('logistics-ai-theme');
    return saved ? saved === 'dark' : true;
  });

  const totalWeight = orders.reduce((s, o) => s + o.weight, 0);
  const totalDistance = vans.reduce((s, v) => s + v.distance, 0).toFixed(1);
  const avgPriority = orders.length
    ? (orders.reduce((s, o) => s + o.priority, 0) / orders.length).toFixed(1)
    : '0';

  // Apply theme class to root
  useEffect(() => {
    document.documentElement.className = darkMode ? '' : 'light';
    localStorage.setItem('logistics-ai-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Auto-dismiss error after 8 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);

  const handleOptimize = useCallback(async () => {
    setLoading(true);
    setError(null);
    setElapsedMs(null);
    try {
      const res = await fetch(`${API_URL}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Server responded ${res.status}`);
      }
      const data = await res.json();
      setVans(data.vans);
      setElapsedMs(data.elapsed_ms ?? null);
      setOptimised(true);
    } catch (err) {
      setError(err.message);
      console.error('Optimize failed:', err);
    } finally {
      setLoading(false);
    }
  }, [orders]);

  const handleReset = useCallback(() => {
    setVans([]);
    setOptimised(false);
    setElapsedMs(null);
  }, []);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header" id="app-header">
        <div className="header__logo">
          <div className="header__icon">🚛</div>
          <div>
            <div className="header__title">Logistics AI</div>
            <div className="header__subtitle">
              Fleet Routing Optimizer · v2.1
            </div>
          </div>
        </div>

        <div className="header__actions">
          {elapsedMs !== null && (
            <span className="elapsed-badge" id="elapsed-badge">
              ⚡ {elapsedMs} ms
            </span>
          )}

          <button
            className="theme-toggle"
            onClick={() => setDarkMode((prev) => !prev)}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            id="theme-toggle-btn"
          >
            <span className="theme-toggle__icon">
              {darkMode ? '☀️' : '🌙'}
            </span>
          </button>

          {optimised && (
            <button
              className="btn btn--ghost"
              onClick={handleReset}
            >
              ↺ Reset
            </button>
          )}
          <button
            className="btn btn--primary"
            onClick={handleOptimize}
            disabled={loading}
            id="optimize-btn"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Optimizing…
              </>
            ) : (
              <>⚡ Optimize Routes</>
            )}
          </button>
        </div>
      </header>

      {/* ── Stats Bar ── */}
      <div className="stats-bar" id="stats-bar">
        <div className="stat-card">
          <div className="stat-card__label">Total Orders</div>
          <div className="stat-card__value stat-card__value--accent">
            {orders.length}
          </div>
          <div className="stat-card__subtitle">Queued for routing</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Active Vans</div>
          <div className="stat-card__value stat-card__value--success">
            {vans.length || '—'}
          </div>
          <div className="stat-card__subtitle">
            {vans.length ? 'Dispatched' : 'Awaiting optimization'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Weight</div>
          <div className="stat-card__value">{totalWeight} kg</div>
          <div className="stat-card__subtitle">Across all orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Total Distance</div>
          <div className="stat-card__value stat-card__value--warning">
            {vans.length ? `${totalDistance} km` : '—'}
          </div>
          <div className="stat-card__subtitle">
            {vans.length ? 'Optimized routing' : 'Not yet calculated'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Avg Priority</div>
          <div className="stat-card__value stat-card__value--info">
            {avgPriority}
          </div>
          <div className="stat-card__subtitle">1 (low) – 10 (high)</div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="error-banner" id="error-banner">
          <span>⚠</span>
          <span>{error}</span>
          <button
            className="btn btn--ghost"
            style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="main">
        <FleetMap orders={orders} vans={vans} />
        <OrderPanel orders={orders} vans={vans} />
      </main>

      {/* ── 3D Section ── */}
      <div className="three-section">
        <div className="three-section__header">
          <h2 className="sidebar__title" style={{ marginBottom: 0 }}>
            3D Fleet Preview
          </h2>
        </div>
        <ThreeScene />
      </div>
    </div>
  );
}
