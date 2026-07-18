const ERROR_MESSAGES = {
  1: "Permesso di geolocalizzazione negato. Abilita la posizione nelle impostazioni del browser.",
  2: "Posizione non disponibile al momento. Riprova.",
  3: "Tempo scaduto durante la ricerca della posizione. Riprova.",
};

export default function getGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ message: "Geolocalizzazione non supportata da questo browser." });
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },

      (error) => {
        reject({ message: ERROR_MESSAGES[error.code] || error.message });
      },

      {
        enableHighAccuracy: true,
        maximumAge:         0,
        timeout:            15_000,
      }
    );
  });
}
