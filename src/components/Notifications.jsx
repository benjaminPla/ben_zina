'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import styles from './Notifications.module.css';

const NotificationContext = createContext(null);

const AUTO_DISMISS_MS = 5000;
const TYPES           = ['error', 'warning'];

export function useNotify() {
	const notify = useContext(NotificationContext);
    if (!notify) throw new Error('useNotify must be used within a NotificationProvider');
	return notify;
}

export function NotificationProvider({ children }) {
	const [toasts, setToasts] = useState([]);
	const nextId              = useRef(0);
	const timeouts            = useRef(new Map());

	const dismiss = useCallback((id) => {
		const timeoutId = timeouts.current.get(id);
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeouts.current.delete(id);
		}
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const notify = useCallback(
		(message, type) => {
			if (!TYPES.includes(type)) throw new Error(`notify: type must be one of ${TYPES.join(', ')}, got "${type}"`);

			const id = nextId.current++;
			setToasts((current) => [...current, { id, message, type }]);
			timeouts.current.set(
				id,
				setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
			);
		},
		[dismiss]
	);

	return (
		<NotificationContext.Provider value={notify}>
			{children}
			<div className={styles.stack} role="alert" aria-live="assertive">
				{toasts.map((toast) => (
					<div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
						<span className={styles.message}>{toast.message}</span>
						<button
							type="button"
							className={styles.close}
							aria-label="Chiudi notifica"
							onClick={() => dismiss(toast.id)}
						>
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
								<path
									d="M2 2L14 14M14 2L2 14"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</svg>
						</button>
					</div>
				))}
			</div>
		</NotificationContext.Provider>
	);
}
