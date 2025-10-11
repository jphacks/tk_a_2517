export default function Home(){
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>CrowdRescue API Console</h1>
      <p style={{ marginBottom: '1rem' }}>
        このフロントエンドは API を提供するために構築されています。次のエンドポイントを利用できます。
      </p>
      <ul style={{ lineHeight: 1.6 }}>
        <li>
          <code>/api/verify</code>: <span>POST で <code>{'{ prompt, expected }'}</code> を送信すると、検証結果を返します。</span>
        </li>
        <li>
          <code>/api/chat</code>: <span>POST で <code>{'{ messages }'}</code> (ChatGPT 形式) を送信すると、応答を返します。</span>
        </li>
      </ul>
      <p style={{ marginTop: '1.5rem' }}>
        Docker Compose のモック設定では、外部 API キーがなくてもテストできます。実運用では Vercel や環境変数に実際のキーを設定してください。
      </p>
    </main>
  );
}
