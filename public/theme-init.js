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

  // iOS 26 home-screen apps report a page height that is short by the status bar,
  // which leaves a gap under the tab bar. In a home-screen app on iPhone the app
  // always fills the whole screen, so size the page from the screen instead.
  if (window.navigator.standalone === true && /iPhone|iPod/.test(navigator.userAgent)) {
    var root = document.documentElement
    root.classList.add('ios-standalone')
    var fit = function () {
      var portrait = window.matchMedia('(orientation: portrait)').matches
      var w = screen.width
      var h = screen.height
      var full = portrait ? Math.max(w, h) : Math.min(w, h)
      root.style.setProperty('--app-height', Math.max(full, window.innerHeight) + 'px')
    }
    fit()
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
  }
})()
