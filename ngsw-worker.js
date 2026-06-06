self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  const title = data.notification.title || "Notification";
  const options = {
    body: data.notification.body || "No content",
    icon: data.notification.icon || "/public/icons/icon-384x384.png",
    actions: data.notification.actions || [],
    data: data.notification.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
