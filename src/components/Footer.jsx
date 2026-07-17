import styles from './Footer.module.css';

export default function Footer() {
	return (
		<footer className={styles.footer}>
			<p className={styles.blurb}>Ciao, sono Ben, il creatore di questa app.</p>

			<div className={styles.actions}>
				<button>
					<a
						href="https://ko-fi.com/benjaminpla"
						target="_blank"
						rel="noopener noreferrer"
					>
						Offrimi un caffè
					</a>
				</button>

				<button>
					<a href="mailto:benjaminpla.dev@gmail.com">
						Scrivimi
					</a>
				</button>
			</div>
		</footer>
	);
}
