import 'leaflet/dist/leaflet.css';
import './globals.css';

const title = 'ben_zina — Trova il carburante più economico vicino a te';
const description =
	'Trova le stazioni di rifornimento self-service più economiche vicino a te, con prezzi in tempo reale';

export const metadata = {
	title,
	description,
	icons: {
		icon: [
			{ url: '/favicon.svg', type: 'image/svg+xml' },
			{ url: '/favicon.ico', sizes: '32x32' },
			{ url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
			{ url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' }
		],
		apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
	},
	manifest: '/manifest.webmanifest',
	openGraph: {
		type: 'website',
		locale: 'it_IT',
		title,
		description,
		images: ['/og-image.png']
	},
	twitter: {
		card: 'summary_large_image',
		title,
		description,
		images: ['/og-image.png']
	}
};

export const viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: '#ffffff'
};

export default function RootLayout({ children }) {
	return (
		<html lang="it">
			<body>{children}</body>
		</html>
	);
}
