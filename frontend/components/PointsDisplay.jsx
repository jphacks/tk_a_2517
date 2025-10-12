'use client';
import React from 'react';

export default function PointsDisplay({ points = 0, scannedCount = 0 }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      flexWrap: 'wrap',
    }}>
      <Badge label={`ポイント: ${points}`} color="#2563eb" />
      <Badge label={`スキャン数: ${scannedCount}`} color="#059669" />
    </div>
  );
}

function Badge({ label, color = '#374151' }) {
  return (
    <span style={{
      background: color,
      color: 'white',
      padding: '6px 12px',
      borderRadius: 999,
      fontSize: 14,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}
