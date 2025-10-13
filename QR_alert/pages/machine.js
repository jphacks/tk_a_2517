import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// ThreeRobotを動的インポート（SSR無効）
const ThreeRobot = dynamic(() => import('../src/ThreeRobot'), { ssr: false });

export default function MachinePage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function fetchOnce() {
      try {
        const res = await fetch(`/api/simulate/${id}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (e) {
        console.error(e);
      }
    }

    fetchOnce();
    const interval = setInterval(fetchOnce, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [id]);

  const statusClass = data ? (data.status === 'critical' ? 'status-critical' : data.status === 'warning' ? 'status-warning' : 'status-normal') : 'status-normal';

  return (
    <div style={{height:'100vh', padding:24, boxSizing:'border-box'}}>
      <div style={{display:'flex', gap:24, height:'100%'}}>
        <div style={{flex:'1 1 600px'}} className="card">
          <h2>Machine: {id}</h2>
          <div style={{height:'64vh', position:'relative'}}>
            <ThreeRobot sensorData={data} />
            <div style={{position:'absolute', right:12, top:12}}>
              <div className={`status-badge ${statusClass}`}>{data ? data.status.toUpperCase() : 'LOADING'}</div>
            </div>
          </div>
        </div>

        <div style={{width:320}} className="card">
          <h3>Telemetry</h3>
          {data ? (
            <>
              <p>Temperature: {data.temp.toFixed(2)} °C</p>
              <p>Vibration: {data.vibration.toFixed(3)}</p>
              <p>Last check: {new Date(data.last_check).toLocaleTimeString()}</p>
              <h4>Reason</h4>
              <pre style={{whiteSpace:'pre-wrap'}}>{data.anomaly_reason}</pre>
            </>
          ) : (
            <p>Loading data…</p>
          )}
          <div style={{marginTop:12}}>
            <button className="btn" onClick={() => router.push('/')}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
