// Runs before the app bundle so the first paint already has the right theme.
;(function () {
  var theme = 'system'
  try {
    theme = localStorage.getItem('routine.theme') || 'system'
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', theme)
})()
