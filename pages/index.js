// pages/index.js — LICA Photo splash page
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div
        onClick={() => router.push('/uploader')}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(/bg-splash.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
    </>
  );
}
