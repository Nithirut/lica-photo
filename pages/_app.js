// pages/_app.js — Global CSS reset and layout wrapper
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <style>{`
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html {
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            -webkit-text-size-adjust: 100%;
            text-size-adjust: 100%;
          }
          body {
            width: 100%;
            min-height: 100%;
            overflow-x: hidden;
            background: #000;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
              'Segoe UI', Helvetica, Arial, sans-serif;
          }
          #__next {
            width: 100%;
            overflow-x: hidden;
          }
          img {
            max-width: 100%;
            display: block;
          }
          button, input, textarea, select {
            font: inherit;
          }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}