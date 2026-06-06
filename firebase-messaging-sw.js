// firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyDZxQT4VB3i0C5b47ipMJCqYWKs4yz74xc",
  authDomain: "app-yuvinka.firebaseapp.com",
  projectId: "app-yuvinka",
  storageBucket: "app-yuvinka.firebasestorage.app",
  messagingSenderId: "1027420932969",
  appId: "1:1027420932969:web:dfeead3f8d87c7472dcbf8",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obtener el servicio de Messaging
const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("Notificación recibida en segundo plano:", payload);

  // Extraer datos del payload
  const notificationTitle = payload.notification?.title || "Nueva notificación";
  const notificationBody =
    payload.notification?.body || "Tienes una nueva notificación";
  const notificationIcon =
    payload.notification?.icon || "/assets/icons/icon-192x192.png";

  // Configurar opciones de la notificación
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    data: payload.data || {},
    actions: payload.data?.actions || [{ action: "open_url", title: "Abrir" }],
  };

  // Mostrar la notificación
  try {
    self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (error) {
    console.error("Error al mostrar la notificación:", error);
  }
});
