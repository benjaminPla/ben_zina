'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './FuelFinder.module.css';

const fuelOptions = ['Benzina', 'Gasolio', 'Metano', 'GPL'];

const ACCURACY_THRESHOLD_M = 25;
const MAX_WATCH_MS = 10000;

const ITALY_BOUNDS = [
	[35.5, 6.6],
	[47.3, 18.6]
];

export default function FuelFinder() {
	const [status, setStatus] = useState('idle');
	const [errorMessage, setErrorMessage] = useState('');
	const [regionName, setRegionName] = useState('');
	const [stations, setStations] = useState([]);
	const [selectedFuel, setSelectedFuel] = useState('Benzina');
	const [sortBy, setSortBy] = useState('distance');
	const [userLocation, setUserLocation] = useState(null);

	const activeWatchId = useRef(null);

	const mapContainer = useRef(null);
	const [mapReady, setMapReady] = useState(false);
	const map = useRef(null);
	const leaflet = useRef(null);

	async function searchNearby(loc) {
		setErrorMessage('');
		setUserLocation(loc);
		setStatus('loading');
		try {
			const res = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(loc)
			});
			if (!res.ok) throw new Error(`Ricerca fallita (${res.status})`);
			const data = await res.json();
			setRegionName(data.region);
			setStations(data.stations);
			setStatus('done');
		} catch (e) {
			setStatus('error');
			setErrorMessage(e instanceof Error ? e.message : 'Qualcosa è andato storto.');
		}
	}

	function findNearMe() {
		setErrorMessage('');
		setUserLocation(null);
		setStatus('locating');

		if (!navigator.geolocation) {
			setStatus('error');
			setErrorMessage('La geolocalizzazione non è supportata da questo browser.');
			return;
		}

		if (activeWatchId.current !== null) {
			navigator.geolocation.clearWatch(activeWatchId.current);
			activeWatchId.current = null;
		}

		let best = null;
		let settled = false;

		const stopWatch = () => {
			if (activeWatchId.current !== null) {
				navigator.geolocation.clearWatch(activeWatchId.current);
				activeWatchId.current = null;
			}
			clearTimeout(budgetTimer);
		};

		const finish = (position) => {
			if (settled) return;
			settled = true;
			stopWatch();
			void searchNearby({ lat: position.coords.latitude, lng: position.coords.longitude });
		};

		const fail = (err) => {
			if (settled) return;
			settled = true;
			stopWatch();
			setStatus('error');
			setErrorMessage(
				err.code === err.PERMISSION_DENIED
					? "Permesso di posizione negato. Consenti l'accesso alla posizione per trovare i prezzi dei carburanti vicini."
					: err.code === err.TIMEOUT
						? 'Individuare una posizione precisa ha richiesto troppo tempo. Riprova.'
						: `Impossibile ottenere la tua posizione: ${err.message}`
			);
		};

		const budgetTimer = setTimeout(() => {
			if (best) {
				finish(best);
			} else if (!settled) {
				settled = true;
				stopWatch();
				setStatus('error');
				setErrorMessage('Individuare una posizione precisa ha richiesto troppo tempo. Riprova.');
			}
		}, MAX_WATCH_MS);

		activeWatchId.current = navigator.geolocation.watchPosition(
			(position) => {
				if (!best || position.coords.accuracy < best.coords.accuracy) best = position;
				if (position.coords.accuracy <= ACCURACY_THRESHOLD_M) finish(position);
			},
			(err) => {
				if (err.code === err.PERMISSION_DENIED || !best) fail(err);
				else finish(best);
			},
			{ enableHighAccuracy: true, timeout: MAX_WATCH_MS, maximumAge: 0 }
		);
	}

	useEffect(() => {
		return () => {
			if (activeWatchId.current !== null) navigator.geolocation.clearWatch(activeWatchId.current);
		};
	}, []);

	const rows = useMemo(() => {
		const matched = [];
		for (const station of stations) {
			const fuel = station.fuels.find((f) => f.name === selectedFuel && f.isSelf);
			if (fuel) matched.push({ station, fuel });
		}
		return matched.sort((a, b) =>
			sortBy === 'price' ? a.fuel.price - b.fuel.price : a.station.distanceKm - b.station.distanceKm
		);
	}, [stations, selectedFuel, sortBy]);

	// Effect 1 — map lifecycle: create once, tear down only on unmount.
	useEffect(() => {
		if (!mapContainer.current) return;

		let cancelled = false;

		(async () => {
			const L = await import('leaflet');

			L.Icon.Default.mergeOptions({
				iconRetinaUrl: '/leaflet/marker-icon-2x.png',
				iconUrl: '/leaflet/marker-icon.png',
				shadowUrl: '/leaflet/marker-shadow.png'
			});

			if (cancelled || !mapContainer.current) return;

			leaflet.current = L;
			const instance = L.map(mapContainer.current);
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19
			}).addTo(instance);

			instance.fitBounds(ITALY_BOUNDS);
			map.current = instance;
			setMapReady(true);
		})();

		return () => {
			cancelled = true;
			setMapReady(false);
			map.current?.remove();
			map.current = null;
			leaflet.current = null;
		};
	}, []);

	// Effect 2 — marker sync: reacts to data changes, only touches markers.
	useEffect(() => {
		const L = leaflet.current;
		const currentMap = map.current;
		if (!mapReady || !L || !currentMap) return;

		const runMarkers = [];
		const bounds = [];

		if (userLocation) {
			const userIcon = L.divIcon({
				className: '',
				html: '<div style="width:18px;height:18px;border-radius:50%;background:#dc2626;border:3px solid #fff;box-shadow:0 0 0 1px #dc2626;"></div>',
				iconSize: [18, 18],
				iconAnchor: [9, 9]
			});
			const marker = L.marker([userLocation.lat, userLocation.lng], { draggable: true, icon: userIcon })
				.addTo(currentMap)
				.bindPopup('Sei qui (trascina il segnalino per correggere la posizione)');

			marker.on('dragend', () => {
				const { lat, lng } = marker.getLatLng();
				setUserLocation({ lat, lng });
				void searchNearby({ lat, lng });
			});

			runMarkers.push(marker);
			bounds.push([userLocation.lat, userLocation.lng]);
		}

		for (const station of stations) {
			const fuel = station.fuels.find((f) => f.name === selectedFuel && f.isSelf);
			const priceText = fuel ? `&euro;${fuel.price.toFixed(3)}` : 'nessun prezzo';
			const marker = L.marker([station.location.lat, station.location.lng])
				.addTo(currentMap)
				.bindPopup(`<strong>${station.brand}</strong><br>${station.name}<br>${priceText}`);
			runMarkers.push(marker);
			bounds.push([station.location.lat, station.location.lng]);
		}

		if (bounds.length > 0) {
			currentMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
		} else {
			currentMap.fitBounds(ITALY_BOUNDS);
		}

		return () => {
			for (const marker of runMarkers) marker.remove();
		};
	}, [mapReady, stations, userLocation, selectedFuel]);

	return (
		<main className={styles.main}>
			<h1 className={styles.h1}>ben_zina più economica vicino a te</h1>

			<button
				className={styles.button}
				onClick={findNearMe}
				disabled={status === 'locating' || status === 'loading'}
			>
				{status === 'locating' ? 'Individuazione della posizione…' : status === 'loading' ? 'Ricerca in corso…' : 'Trova'}
			</button>

			{status === 'error' && <p className={styles.error}>{errorMessage}</p>}

			<div className={styles.map} ref={mapContainer}></div>
			{userLocation && <p className={styles.hint}>Se il segnalino non è nella posizione giusta, trascinalo.</p>}

			{status === 'done' && (
				<>
					<div className={styles.controls}>
						<label>
							Carburante:
							<select value={selectedFuel} onChange={(e) => setSelectedFuel(e.target.value)}>
								{fuelOptions.map((fuel) => (
									<option key={fuel} value={fuel}>
										{fuel}
									</option>
								))}
							</select>
						</label>

						<label>
							Ordina per:
							<select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
								<option value="distance">Distanza</option>
								<option value="price">Prezzo</option>
							</select>
						</label>

						<span className={styles.region}>Regione: {regionName}</span>
					</div>

					{rows.length === 0 ? (
						<p>Nessuna stazione segnala prezzi per {selectedFuel} nelle vicinanze.</p>
					) : (
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Marchio</th>
									<th>Indirizzo</th>
									<th>Distanza</th>
									<th>Prezzo</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row, i) => (
									<tr key={`${row.station.id}-${row.fuel.id}`} className={i === 0 ? styles.cheapest : undefined}>
										<td>{row.station.brand}</td>
										<td>{row.station.address}</td>
										<td>{row.station.distanceKm.toFixed(1)} km</td>
										<td>&euro;{row.fuel.price.toFixed(3)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</>
			)}
		</main>
	);
}
