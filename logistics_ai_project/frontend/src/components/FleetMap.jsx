import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const VAN_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
];

const createOrderIcon = (label, color, isOptimised) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background: ${color};
      color: #fff;
      font-family: Inter, sans-serif;
      font-size: 11px;
      font-weight: 800;
      width: ${isOptimised ? 36 : 32}px;
      height: ${isOptimised ? 36 : 32}px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 12px ${color}55, 0 0 ${isOptimised ? '20' : '0'}px ${color}44;
      border: 2.5px solid rgba(255,255,255,0.4);
      transition: all 0.3s ease;
      position: relative;
    ">
      ${label}
      ${isOptimised ? `<div style="
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid ${color}44;
        animation: markerPulse 2s ease-out infinite;
      "></div>` : ''}
    </div>
    <style>
      @keyframes markerPulse {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    </style>`,
    iconSize: [isOptimised ? 36 : 32, isOptimised ? 36 : 32],
    iconAnchor: [isOptimised ? 18 : 16, isOptimised ? 18 : 16],
  });

const createDepotIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 18px; height: 18px;
      background: linear-gradient(135deg, #f59e0b, #f97316);
      border-radius: 50%;
      border: 2.5px solid rgba(255,255,255,0.5);
      box-shadow: 0 0 16px rgba(245,158,11,0.5), 0 0 32px rgba(245,158,11,0.2);
      position: relative;
    ">
      <div style="
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        border: 2px solid rgba(245,158,11,0.3);
        animation: depotPulse 2.5s ease-out infinite;
      "></div>
    </div>
    <style>
      @keyframes depotPulse {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    </style>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export default function FleetMap({ orders, vans }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroup = useRef(null);

  // Initialise map once
  useEffect(() => {
    if (mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);
    L.control
      .attribution({ prefix: false })
      .addAttribution('© <a href="https://carto.com">CARTO</a>')
      .addTo(mapInstance.current);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    ).addTo(mapInstance.current);

    layerGroup.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers and routes
  useEffect(() => {
    if (!layerGroup.current || !orders.length) return;
    layerGroup.current.clearLayers();

    const orderMap = {};
    orders.forEach((o) => (orderMap[o.id] = o));

    const orderVanMap = {};
    vans.forEach((van, idx) => {
      van.route.forEach((oid) => (orderVanMap[oid] = idx));
    });

    const hasVans = vans.length > 0;

    // Add depot marker at centroid
    if (hasVans) {
      const avgLat = orders.reduce((s, o) => s + o.lat, 0) / orders.length;
      const avgLng = orders.reduce((s, o) => s + o.lng, 0) / orders.length;

      const depotMarker = L.marker([avgLat, avgLng], {
        icon: createDepotIcon(),
        zIndexOffset: 1000,
      });
      depotMarker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px;text-align:center;">
          <strong style="color:#f59e0b;">📍 Depot</strong><br/>
          <span style="opacity:0.7;font-size:11px;">${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}</span>
        </div>`,
        { className: 'dark-popup' }
      );
      layerGroup.current.addLayer(depotMarker);
    }

    // Add order markers
    orders.forEach((order) => {
      const vanIdx = orderVanMap[order.id];
      const isAssigned = vanIdx !== undefined;
      const color = isAssigned
        ? VAN_COLORS[vanIdx % VAN_COLORS.length]
        : '#475569';
      const marker = L.marker([order.lat, order.lng], {
        icon: createOrderIcon(
          order.id.replace(/[^0-9]/g, ''),
          color,
          isAssigned
        ),
      });

      const vanLabel = isAssigned
        ? `<br/><span style="color:${color};font-weight:700">● ${
            vans[vanIdx].id.replace('_', ' ').toUpperCase()
          }</span>`
        : '';

      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.7;min-width:150px;">
          <strong style="font-size:15px;letter-spacing:-0.02em;">${order.id}</strong>${vanLabel}<br/>
          <span style="opacity:0.7">📦</span> ${order.weight} kg &nbsp;
          <span style="opacity:0.7">⚡</span> P${order.priority}
          <br/><span style="opacity:0.5;font-size:11px;">📍 ${order.lat.toFixed(4)}, ${order.lng.toFixed(4)}</span>
        </div>`,
        { className: 'dark-popup' }
      );
      layerGroup.current.addLayer(marker);
    });

    // Draw polylines per van
    vans.forEach((van, idx) => {
      const color = VAN_COLORS[idx % VAN_COLORS.length];
      const latlngs = van.route
        .map((oid) => orderMap[oid])
        .filter(Boolean)
        .map((o) => [o.lat, o.lng]);

      if (latlngs.length > 1) {
        // Route shadow (for depth)
        L.polyline(latlngs, {
          color: '#000',
          weight: 7,
          opacity: 0.2,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup.current);

        // Outer glow line
        L.polyline(latlngs, {
          color,
          weight: 5,
          opacity: 0.25,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup.current);

        // Main route line
        L.polyline(latlngs, {
          color,
          weight: 3,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '12 6',
          dashOffset: '0',
        }).addTo(layerGroup.current);

        // Direction arrow markers along route
        for (let i = 0; i < latlngs.length - 1; i++) {
          const from = latlngs[i];
          const to = latlngs[i + 1];
          const midLat = (from[0] + to[0]) / 2;
          const midLng = (from[1] + to[1]) / 2;

          // Calculate arrow rotation
          const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * (180 / Math.PI);

          const arrowIcon = L.divIcon({
            className: '',
            html: `<div style="
              color: ${color};
              font-size: 14px;
              transform: rotate(${90 - angle}deg);
              opacity: 0.7;
              text-shadow: 0 0 4px ${color}88;
            ">▲</div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });

          L.marker([midLat, midLng], { icon: arrowIcon, interactive: false })
            .addTo(layerGroup.current);
        }

        // Endpoint circles for clarity
        latlngs.forEach((ll, i) => {
          if (i === 0) return;
          L.circleMarker(ll, {
            radius: 4,
            color,
            fillColor: color,
            fillOpacity: 0.5,
            weight: 1,
            opacity: 0.6,
          }).addTo(layerGroup.current);
        });
      }
    });

    // Fit bounds with animation
    const allCoords = orders.map((o) => [o.lat, o.lng]);
    if (allCoords.length) {
      mapInstance.current.fitBounds(allCoords, {
        padding: [60, 60],
        animate: true,
        duration: 1.0,
      });
    }
  }, [orders, vans]);

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" id="fleet-map" />
    </div>
  );
}
