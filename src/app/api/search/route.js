import { NextResponse } from 'next/server';
import { haversineKm, nearestRegion, searchArea } from '@/lib/server/mise';

const MAX_STATIONS = 50;

export async function POST(request) {
	const body = await request.json().catch(() => null);
	const lat = body?.lat;
	const lng = body?.lng;

	if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
		return NextResponse.json({ message: 'Expected JSON body { lat: number, lng: number }' }, { status: 400 });
	}

	const region = nearestRegion({ lat, lng });
	const result = await searchArea({ region: region.id });

	const stations = result.results
		.map((station) => ({
			...station,
			distanceKm: haversineKm({ lat, lng }, station.location)
		}))
		.sort((a, b) => a.distanceKm - b.distanceKm)
		.slice(0, MAX_STATIONS);

	return NextResponse.json({ region: region.name, stations });
}
