export const metadata = {
  title: 'CrowdRescue API Console',
  description: 'Simple landing page describing the available API endpoints.',
};

export default function RootLayout({ children }){
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: '#f7f7f9' }}>{children}</body>
    </html>
  );
}
