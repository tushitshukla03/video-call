import React from 'react';
import App from 'next/app';
import '../styles/tailwind.css';
function MyApp({ Component, pageProps }) {
    return <Component {...pageProps} />;
}

export default MyApp;
