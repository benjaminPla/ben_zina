'use client';

import { FUELS } from '@lib/constants'
import getGeolocation from '@lib/geolocation'
import Logo from '../components/Logo';
import Map from '../components/Map';
import StationsTable from '../components/StationsTable';
import { useNotify } from '../components/Notifications'
import { useState } from 'react';

const RADIUS_MIN = 1;
const RADIUS_MAX = 20;

export default function Page() {
	const notify = useNotify();

	const [fuel,          setFuel]          = useState('');
	const [location,      setLocation]      = useState(null);
	const [radius,        setRadius]        = useState(2);
	const [selectedIndex, setSelectedIndex] = useState(null);
	const [stations,      setStations]      = useState([]);
	const [status,        setStatus]        = useState('idle');

    async function fetchStations(lat, lng) {
		try {
            setStatus('loading');
            setSelectedIndex(null);

            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fuel, lat, lng, radius })
            });

            if (!res.ok) throw new Error('Ricerca fallita');

            const data = await res.json();
            setStations(data.stations);
            setStatus('done');
		} catch (error) {
			setStatus('error');
			notify(error?.message || 'Qualcosa è andato storto', 'error');
		}
    }

    async function search() {
		try {
            setStatus('locating');

            const { lat, lng } = await getGeolocation();

            setLocation({ lat, lng });
            await fetchStations(lat, lng);
		} catch (error) {
			setStatus('error');
			notify(error?.message || 'Qualcosa è andato storto', 'error');
		}
    }

    function handleLocationChange(loc) {
        setLocation(loc);
        fetchStations(loc.lat, loc.lng);
    }

    function handleRadiusChange(e) {
        const value = Number(e.target.value) || RADIUS_MIN;
        setRadius(Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, value)))
    }

    function handleFuelChange(e) {
        setFuel(e.target.value)
    }

	return (
		<main>
            <div className="titleRow">
                <Logo size={32} />
                <h1>ben-zina</h1>
            </div>
            <p className="subtitle">Trova il carburante più economico vicino a te</p>

			<div className="controls">
				<label htmlFor="radius">Raggio (km):</label>
				<input id="radius" type='number' value={radius} min={RADIUS_MIN} max={RADIUS_MAX} step="1" onChange={handleRadiusChange}/>

				<label htmlFor="fuel">Carburante:</label>
				<select id="fuel" value={fuel} onChange={handleFuelChange}>
					<option value="" disabled>Seleziona</option>
					{FUELS.map((fuel) => (
						<option key={fuel.id} value={fuel.id}>
							{fuel.description}
						</option>
					))}
				</select>
			</div>

			<button onClick={search} disabled={!fuel || !radius || status === 'locating' || status === 'loading'}>
				{status === 'locating' ? 'Individuazione della posizione…' : status === 'loading' ? 'Ricerca in corso…' : 'Trova'}
			</button>

			<Map
				stations={stations}
				location={location}
				selectedFuel={fuel}
				status={status}
				onLocationChange={handleLocationChange}
				selectedIndex={selectedIndex}
			/>

			<StationsTable
				stations={stations}
				selectedFuel={fuel}
				selectedIndex={selectedIndex}
				onSelect={setSelectedIndex}
			/>

		</main>
    )
}
