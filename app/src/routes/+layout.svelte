<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<title>ben_zina — Trova il carburante più economico vicino a te</title>
	<meta name="description" content="Trova le stazioni di rifornimento self-service più economiche vicino a te, con prezzi in tempo reale" />

	<meta property="og:type" content="website" />
	<meta property="og:locale" content="it_IT" />
	<meta property="og:title" content="ben_zina — Trova il carburante più economico vicino a te" />
	<meta property="og:description" content="Trova le stazioni di rifornimento self-service più economiche vicino a te, con prezzi in tempo reale" />
	<meta property="og:image" content="/og-image.png" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="ben_zina — Trova il carburante più economico vicino a te" />
	<meta name="twitter:description" content="Trova le stazioni di rifornimento self-service più economiche vicino a te, con prezzi in tempo reale" />
	<meta name="twitter:image" content="/og-image.png" />
</svelte:head>

{@render children()}
