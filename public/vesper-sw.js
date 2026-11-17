self.addEventListener('push', event => {
  let data;
  try { data = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification(data.title || 'Vesper', {
    body: data.body || 'Your repository has an update.', icon: '/vesper/vesper.svg', tag: data.tag || 'vesper', data: { url: '/vesper' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const page = clients.find(client => new URL(client.url).pathname === '/vesper');
    if (page) return page.focus();
    return self.clients.openWindow('/vesper');
  }));
});
