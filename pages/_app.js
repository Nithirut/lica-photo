// pages/_app.js — global CSS reset + layout wrapper
import Head from 'next/head';

var G = [
  '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
  'html { width: 100%; height: 100%; overflow-x: hidden; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }',
  'body { width: 100%; min-height: 100%; overflow-x: hidden; background: #000;',
  '  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;',
  '  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif; }',
  '#__next { width: 100%; overflow-x: hidden; }',
  'img, video, canvas, svg { max-width: 100%; display: block; }',
  'button, input, textarea, select { font: inherit; }'
].join('\n');

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style>{G}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
