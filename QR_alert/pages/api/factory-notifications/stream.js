import { getFactoryManagerNotification } from '../../../lib/factoryManagerNotification';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const fm = getFactoryManagerNotification();

  // Send initial data
  const sendData = () => {
    const payload = {
      notifications: fm.getNotificationHistory(),
      stats: fm.getNotificationStats()
    };
    res.write(`event: update\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // listener
  const listener = () => {
    try { sendData(); } catch (e) {}
  };

  // send initial
  sendData();

  // subscribe
  const unsubscribe = fm.onUpdate(listener);

  // cleanup on client disconnect
  req.on('close', () => {
    try { unsubscribe(); } catch (e) {}
    try { res.end(); } catch (e) {}
  });
}
