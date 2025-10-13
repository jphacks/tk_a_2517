import '../styles/globals.css';
import '../lib/autoStart'; // バックグラウンド監視の自動起動

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
