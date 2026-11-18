// Runs before the app bundle so the first paint already has the right theme.
;(function () {
  var theme = 'system'
  try {
    theme = localStorage.getItem('routine.theme') || 'system'
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', theme)
  var light = theme === 'light' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)
  // iOS reads this when the home-screen app launches: dark text on the light theme.
  var bar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (bar && light) bar.setAttribute('content', 'default')
})()
