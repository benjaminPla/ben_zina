'use client';

import styles from './Map.module.css';
import { useNotify } from './Notifications';
import { useEffect, useRef, useState } from 'react';

const ITALY_BOUNDS = [ [35.5, 6.6], [47.3, 18.6] ];

const ICON_ANCHOR  = [10, 33];
const ICON_SIZE    = [20, 33];
const POPUP_ANCHOR = [1, -28];
const SHADOW_SIZE  = [33, 33];

const USER_ICON_HTML = `<svg width="${ICON_SIZE[0]}" height="${ICON_SIZE[1]}" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
	<path d="M12.5 0C5.6 0 0 5.6 0 12.5 0 19.4 12.5 41 12.5 41S25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1"/>
	<circle cx="12.5" cy="12.5" r="5.5" fill="#ffffff"/>
</svg>`;

export default function Map({ stations = [], location, selectedFuel, status, onLocationChange }) {
	const notify                  = useNotify();
	const mapContainer            = useRef(null);
	const [mapReady, setMapReady] = useState(false);
	const map                     = useRef(null);
	const leaflet                 = useRef(null);

	useEffect(() => {
		if (!mapContainer.current) return;

		let cancelled = false;

		(async () => {
			const L = await import('leaflet');

			L.Icon.Default.mergeOptions({
				iconRetinaUrl: '/leaflet/marker-icon-2x.png',
				iconUrl:       '/leaflet/marker-icon.png',
				shadowUrl:     '/leaflet/marker-shadow.png',
				iconSize:      ICON_SIZE,
				iconAnchor:    ICON_ANCHOR,
				popupAnchor:   POPUP_ANCHOR,
				shadowSize:    SHADOW_SIZE
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
			cancelled       = true;
			setMapReady(false);
			map.current?.remove();
			map.current     = null;
			leaflet.current = null;
		};
	}, []);

	useEffect(() => {
		const L          = leaflet.current;
		const currentMap = map.current;
		if (!mapReady || !L || !currentMap) return;

		const runMarkers = [];
		const bounds     = [];

		if (location) {
			const userIcon = L.divIcon({
				className:   '',
				html:        USER_ICON_HTML,
				iconSize:    ICON_SIZE,
				iconAnchor:  ICON_ANCHOR,
				popupAnchor: POPUP_ANCHOR
			});
			const marker = L.marker([location.lat, location.lng], { draggable: true, icon: userIcon })
				.addTo(currentMap)
				.bindPopup(`
                    <div class="${styles.marker}">
                        <span>Sei qui (trascina il segnalino per correggere la posizione)</span>
                    </div>`, { maxWidth: 220 });

			marker.on('dragend', () => {
				const { lat, lng } = marker.getLatLng();
				onLocationChange({ lat, lng });
			});

			runMarkers.push(marker);
			bounds.push([location.lat, location.lng]);
		}

		if (status === 'done' && stations.length === 0) {
			notify('Nessuna stazione trovata nelle vicinanze', 'warning');
		}

		for (const station of stations) {
			try {
				const fuelId    = parseInt(selectedFuel, 10);
				const fuel      = station.fuels.find((f) => f.fuelId === fuelId && f.isSelf);
				const priceText = fuel ? `&euro;${fuel.price.toFixed(3)}` : 'nessun prezzo';
				const priceClass = fuel ? styles.price : styles.noPrice;
				const updatedDate = station.insertDate ? new Date(station.insertDate) : null;
				const updatedText = updatedDate && !isNaN(updatedDate) ? `Aggiornato: ${updatedDate.toLocaleDateString('it-IT')}` : null;
				const marker = L.marker([station.location.lat, station.location.lng])
					.addTo(currentMap)
					.bindPopup(`
                        <div class="${styles.marker}">
                            <span>${station.brand}</span>
                            <span>${station.name}</span>
                            <span class="${priceClass}">${priceText}</span>
                            ${updatedText ? `<span class="${styles.updated}">${updatedText}</span>` : ''}
                        </div>`, { maxWidth: 220 });
				runMarkers.push(marker);
				bounds.push([station.location.lat, station.location.lng]);
			} catch (err) {
				console.error('marker_error', err, station);
			}
		}

		if (bounds.length > 0) {
			currentMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
		} else {
			currentMap.fitBounds(ITALY_BOUNDS);
		}

		return () => {
			for (const marker of runMarkers) marker.remove();
		};
	}, [mapReady, stations, location, selectedFuel, status, onLocationChange, notify]);

	const centerOnLocation = () => {
		if (!map.current || !location) return;
		map.current.setView([location.lat, location.lng], Math.max(map.current.getZoom(), 14));
	};

	return (
		<>
			<div className={styles.mapWrap}>
				<div className={styles.map} ref={mapContainer}></div>
				{location && (
					<button
						type="button"
						className={styles.centerButton}
						onClick={centerOnLocation}
						aria-label="Centra la mappa sulla mia posizione"
						title="Centra sulla mia posizione"
					>
						◎
					</button>
				)}
			</div>
			{location && <p className={styles.hint}>Se il segnalino non è nella posizione giusta, trascinalo.</p>}
		</>
	);
}
