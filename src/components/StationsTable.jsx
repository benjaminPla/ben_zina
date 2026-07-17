import styles from './StationsTable.module.css';

function isToday(date) {
	const now = new Date();
	return date.getFullYear() === now.getFullYear()
		&& date.getMonth() === now.getMonth()
		&& date.getDate() === now.getDate();
}

export default function StationsTable({ stations = [], selectedFuel }) {
	if (stations.length === 0) return null;

	const fuelId = parseInt(selectedFuel, 10);

	return (
		<div className={styles.wrap}>
			<table className={styles.table}>
				<thead>
					<tr>
						<th>Marca</th>
						<th>Distributore</th>
						<th>Aggiornato</th>
						<th>Prezzo</th>
					</tr>
				</thead>
				<tbody>
					{stations.map((station, i) => {
						const fuel        = station.fuels?.find((f) => f.fuelId === fuelId && f.isSelf);
						const priceText   = fuel ? `€${fuel.price.toFixed(3)}` : '—';
						const updatedDate = station.insertDate ? new Date(station.insertDate) : null;
						const validDate   = updatedDate && !isNaN(updatedDate);
						const stale       = validDate && !isToday(updatedDate);

						return (
							<tr key={station.id ?? i}>
								<td data-label="Marca">{station.brand}</td>
								<td data-label="Distributore">{station.name}</td>
								<td data-label="Aggiornato" className={stale ? styles.stale : undefined}>
									{validDate ? updatedDate.toLocaleDateString('it-IT') : '—'}
								</td>
								<td data-label="Prezzo" className={styles.price}>{priceText}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
