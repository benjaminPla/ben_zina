export default function getGeolocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ message: "Geolocation not supported" });
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },

      (error) => {
        reject({ message: error.message });
      },

      {
        enableHighAccuracy: true,
        maximumAge:         0,
        timeout:            5000,
      }
    );
  });
}
