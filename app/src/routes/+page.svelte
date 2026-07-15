<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type { Map as LeafletMap, Marker } from 'leaflet';

	interface LatLng {
		lat: number;
		lng: number;
	}

	interface Fuel {
		id: number;
		price: number;
		name: string;
		fuelId: number;
		isSelf: boolean;
	}

	interface Station {
		id: number;
		name: string;
		brand: string;
		address: string;
		distanceKm: number;
		location: LatLng;
		fuels: Fuel[];
	}

	type Status = 'idle' | 'locating' | 'loading' | 'error' | 'done';

	let status = $state<Status>('idle');
	let errorMessage = $state('');
	let regionName = $state('');
	let stations = $state<Station[]>([]);
	let selectedFuel = $state('Benzina');
	let sortBy = $state<'distance' | 'price'>('distance');
	let userLocation = $state<LatLng | null>(null);

	const fuelOptions = ['Benzina', 'Gasolio', 'Metano', 'GPL'];

	async function findNearMe() {
		errorMessage = '';
		userLocation = null;
		status = 'locating';

		if (!navigator.geolocation) {
			status = 'error';
			errorMessage = 'La geolocalizzazione non è supportata da questo browser.';
			return;
		}

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				status = 'loading';
				userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
				try {
					const res = await fetch('/api/search', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							lat: position.coords.latitude,
							lng: position.coords.longitude
						})
					});
					if (!res.ok) throw new Error(`Ricerca fallita (${res.status})`);
					const data = await res.json();
					regionName = data.region;
					stations = data.stations;
					status = 'done';
				} catch (e) {
					status = 'error';
					errorMessage = e instanceof Error ? e.message : 'Qualcosa è andato storto.';
				}
			},
			(err) => {
				status = 'error';
				errorMessage =
					err.code === err.PERMISSION_DENIED
						? "Permesso di posizione negato. Consenti l'accesso alla posizione per trovare i prezzi dei carburanti vicini."
						: err.code === err.TIMEOUT
							? 'Individuare una posizione precisa ha richiesto troppo tempo. Riprova.'
							: `Impossibile ottenere la tua posizione: ${err.message}`;
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0
			}
		);
	}

	interface Row {
		station: Station;
		fuel: Fuel;
	}

	const rows = $derived.by<Row[]>(() => {
		const matched: Row[] = [];
		for (const station of stations) {
			const fuel = station.fuels.find((f) => f.name === selectedFuel && f.isSelf);
			if (fuel) matched.push({ station, fuel });
		}
		return matched.sort((a, b) =>
			sortBy === 'price' ? a.fuel.price - b.fuel.price : a.station.distanceKm - b.station.distanceKm
		);
	});

	let mapContainer = $state<HTMLDivElement | null>(null);
	let map: LeafletMap | null = null;
	let markers: Marker[] = [];

	// Reads `selectedFuel` too, so switching fuel rebuilds the whole map (cheap given <=50
	// stations) instead of just updating popup text in place — not a bug.
	$effect(() => {
		if (!mapContainer || stations.length === 0) return;

		let cancelled = false;

		(async () => {
			const L = (await import('leaflet')).default;

			// Leaflet's default marker icons reference relative image paths that 404 once
			// bundled by Vite — repoint them at the actual bundled asset URLs.
			const iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png?url')).default;
			const iconUrl = (await import('leaflet/dist/images/marker-icon.png?url')).default;
			const shadowUrl = (await import('leaflet/dist/images/marker-shadow.png?url')).default;
			L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

			if (cancelled || !mapContainer) return;

			map = L.map(mapContainer);
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19
			}).addTo(map);

			const bounds: [number, number][] = [];

			if (userLocation) {
				const marker = L.marker([userLocation.lat, userLocation.lng]).addTo(map).bindPopup('Sei qui');
				markers.push(marker);
				bounds.push([userLocation.lat, userLocation.lng]);
			}

			for (const station of stations) {
				const fuel = station.fuels.find((f) => f.name === selectedFuel && f.isSelf);
				const priceText = fuel ? `&euro;${fuel.price.toFixed(3)}` : 'nessun prezzo';
				const marker = L.marker([station.location.lat, station.location.lng])
					.addTo(map)
					.bindPopup(`<strong>${station.brand}</strong><br>${station.name}<br>${priceText}`);
				markers.push(marker);
				bounds.push([station.location.lat, station.location.lng]);
			}

			if (bounds.length > 0) map.fitBounds(bounds, { padding: [24, 24] });
		})();

		return () => {
			cancelled = true;
			markers = [];
			map?.remove();
			map = null;
		};
	});
</script>

<main>
	<h1>ben_zina più economica vicino a me</h1>

	<button onclick={findNearMe} disabled={status === 'locating' || status === 'loading'}>
		{#if status === 'locating'}
			Individuazione della posizione…
		{:else if status === 'loading'}
			Ricerca in corso…
		{:else}
			Trova carburante vicino a me
		{/if}
	</button>

	{#if status === 'error'}
		<p class="error">{errorMessage}</p>
	{/if}

    {#if stations.length > 0}
        <div class="map" bind:this={mapContainer}></div>
    {/if}

	{#if status === 'done'}
		<div class="controls">
			<label>
				Carburante:
				<select bind:value={selectedFuel}>
					{#each fuelOptions as fuel (fuel)}
						<option value={fuel}>{fuel}</option>
					{/each}
				</select>
			</label>

			<label>
				Ordina per:
				<select bind:value={sortBy}>
					<option value="distance">Distanza</option>
					<option value="price">Prezzo</option>
				</select>
			</label>

			<span class="region">Regione: {regionName}</span>
		</div>

		{#if rows.length === 0}
			<p>Nessuna stazione segnala prezzi per {selectedFuel} nelle vicinanze.</p>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Marchio</th>
						<th>Indirizzo</th>
						<th>Distanza</th>
						<th>Prezzo</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row, i (row.station.id + '-' + row.fuel.id)}
						<tr class:cheapest={i === 0}>
							<td>{row.station.brand}</td>
							<td>{row.station.address}</td>
							<td>{row.station.distanceKm.toFixed(1)} km</td>
							<td>&euro;{row.fuel.price.toFixed(3)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/if}
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, sans-serif;
	}

	h1 {
		margin-bottom: 0.25rem;
	}

	.sub {
		color: #666;
		margin-top: 0;
	}

	button {
		font-size: 1rem;
		padding: 0.6rem 1.2rem;
		cursor: pointer;
	}

	.error {
		color: #b00020;
	}

	.controls {
		display: flex;
		gap: 1.5rem;
		align-items: center;
		margin: 1.5rem 0 1rem;
		flex-wrap: wrap;
	}

	.region {
		color: #666;
		font-size: 0.9rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		text-align: left;
		padding: 0.5rem;
		border-bottom: 1px solid #ddd;
	}

	tr.cheapest {
		background: #e6f4ea;
		font-weight: 600;
	}

	.map {
		height: 400px;
		margin-top: 1.5rem;
		border-radius: 4px;
		overflow: hidden;
	}
</style>
