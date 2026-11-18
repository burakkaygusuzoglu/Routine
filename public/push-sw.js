// Push handlers, loaded into the generated service worker with importScripts.
// The server sends JSON { title, body, tag, url }; plain text is shown as the body.

self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { body: event.data.text() }
    }
  }
  const title = data.title || 'Routine'
  // Browsers (iOS in particular) require every push to show a notification.
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      icon: '/Routine/icons/icon-192.png',
      badge: '/Routine/icons/icon-192.png',
      data: { url: data.url || '#/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // The url is a hash route such as "#/" under the service worker scope (/Routine/).
  // Only same-origin URLs inside the scope are opened; anything else falls back to the scope.
  const scope = self.registration.scope
  let target = scope
  try {
    const resolved = new URL((event.notification.data && event.notification.data.url) || '#/', scope)
    if (resolved.origin === self.location.origin && resolved.href.startsWith(scope)) target = resolved.href
  } catch {
    // Malformed url: use the scope.
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((c) => c.url.startsWith(self.registration.scope))
      if (open) {
        try {
          await open.focus()
          if ('navigate' in open) await open.navigate(target)
          return
        } catch {
          // Fall through and open a new window.
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
