// Hello World Plugin - content.js
// window.sharkPlugin はShark Browserが自動でセットします

(function() {
  const s = window.sharkPlugin?.settings;
  if (!s?.enabled) return;

  const badge = document.createElement('div');
  badge.id = 'shark-hello-badge';
  badge.textContent = s.text || '🦈 Shark';
  document.body.appendChild(badge);
})();
