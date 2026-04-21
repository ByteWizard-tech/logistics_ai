const VAN_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
];

const MAX_VAN_WEIGHT = 50;

function getPriorityClass(p) {
  if (p >= 7) return 'priority--high';
  if (p >= 4) return 'priority--medium';
  return 'priority--low';
}

function getPriorityLabel(p) {
  if (p >= 7) return 'HIGH';
  if (p >= 4) return 'MED';
  return 'LOW';
}

function getCapacityPercent(weight) {
  return Math.min(100, Math.round((weight / MAX_VAN_WEIGHT) * 100));
}

export default function OrderPanel({ orders, vans }) {
  const orderVanMap = {};
  vans.forEach((van) => {
    van.route.forEach((oid) => (orderVanMap[oid] = van.id));
  });

  return (
    <div className="sidebar" id="order-panel">
      <div className="sidebar__section">
        <h2 className="sidebar__title">Fleet Routes</h2>
        {vans.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🚛</div>
            <p className="empty-state__text">
              Click <strong>Optimize Routes</strong> to generate
              <br />fleet assignments & optimal routing.
            </p>
          </div>
        )}
        {vans.map((van, idx) => {
          const pct = getCapacityPercent(van.total_weight);
          return (
            <div className="van-card" key={van.id}>
              <div className="van-card__header">
                <span className="van-card__name">
                  <span className="van-card__dot" style={{ color: VAN_COLORS[idx % VAN_COLORS.length], background: VAN_COLORS[idx % VAN_COLORS.length] }} />
                  {van.id.replace('_', ' ').toUpperCase()}
                </span>
                <div className="van-card__meta">
                  {van.total_weight > 0 && <span className="van-card__weight">{van.total_weight} kg</span>}
                  <span className="van-card__distance">{van.distance} km</span>
                </div>
              </div>
              <div className="van-card__capacity">
                <div className="van-card__capacity-bar">
                  <div className={`van-card__capacity-fill ${pct >= 80 ? 'van-card__capacity-fill--warning' : ''}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="van-card__capacity-label">{pct}% capacity · {van.order_count} order{van.order_count !== 1 ? 's' : ''}</div>
              </div>
              <div className="van-card__route">
                {van.route.map((stop, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="van-card__stop">{stop}</span>
                    {i < van.route.length - 1 && <span className="van-card__arrow">→</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="sidebar__section">
        <h2 className="sidebar__title">Orders ({orders.length})</h2>
        {orders.map((order) => (
          <div className="order-item" key={order.id}>
            <span className="order-item__id">{order.id}</span>
            <div className="order-item__details">
              <span><span className="order-item__detail-icon">📦</span>{order.weight} kg</span>
              <span><span className="order-item__detail-icon">📍</span>{order.lat.toFixed(3)}, {order.lng.toFixed(3)}</span>
              {orderVanMap[order.id] && (
                <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
                  🚛 {orderVanMap[order.id].replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
            <span className={`order-item__priority ${getPriorityClass(order.priority)}`}>
              P{order.priority} · {getPriorityLabel(order.priority)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
