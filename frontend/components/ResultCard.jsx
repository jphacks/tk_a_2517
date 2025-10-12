'use client';
import React from 'react';

export default function ResultCard({ title, message, nearby = [] }) {
  if (!message && (!nearby || nearby.length === 0)) return null;
  return (
    <div style={{
      width: '100%',
      maxWidth: 640,
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 16,
      background: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      marginTop: 12,
    }}>
      {title && <h3 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h3>}
      {message && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{message}</p>}
      {nearby && nearby.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ fontWeight: 600, marginBottom: 6 }}>近隣のおすすめ</h4>
          <ul style={{ paddingLeft: 18 }}>
            {nearby.map((n, idx) => (
              <li key={idx}>{typeof n === 'string' ? n : n.name || JSON.stringify(n)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
