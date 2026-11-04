// RatKing: manually export/import local progress as a JSON file.
(() => {
  const prefixes = ['ratKing'];
  const keep = key => prefixes.some(prefix => key.startsWith(prefix));
  const status = document.getElementById('backupStatus');
  const setStatus = text => { if (status) status.textContent = text; };
  const exportButton = document.getElementById('exportSave');
  const importButton = document.getElementById('importSave');
  const fileInput = document.getElementById('saveFileInput');
  if (!exportButton || !importButton || !fileInput) return;

  exportButton.addEventListener('click', () => {
    try {
      const entries = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && keep(key)) entries[key] = localStorage.getItem(key);
      }
      const payload = JSON.stringify({ app: 'RatKing', version: 1, entries }, null, 2);
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'RatKing-Spielstand.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setStatus('Backup erstellt: Prüfe den Download und bewahre die Datei sicher auf.');
    } catch (error) {
      setStatus('Backup fehlgeschlagen: ' + error.message);
    }
  });

  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Datei zu groß');
      const payload = JSON.parse(await file.text());
      const entries = payload?.entries;
      if (payload?.app !== 'RatKing' || payload.version !== 1 || !entries ||
          Array.isArray(entries) || typeof entries !== 'object') throw new Error('Ungültiges RatKing-Backup');
      const pairs = Object.entries(entries);
      if (pairs.length > 300 || pairs.some(([k,v]) => !keep(k) || typeof v !== 'string' || v.length > 250000)) {
        throw new Error('Ungültige Spielstanddaten');
      }
      if (!confirm('Aktuellen Spielstand durch dieses Backup ersetzen? Bitte vorher sichern.')) return;
      const old = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && keep(key)) old[key] = localStorage.getItem(key);
      }
      try {
        Object.keys(old).forEach(key => localStorage.removeItem(key));
        pairs.forEach(([key, value]) => localStorage.setItem(key, value));
      } catch (error) {
        pairs.forEach(([key]) => localStorage.removeItem(key));
        Object.entries(old).forEach(([key, value]) => localStorage.setItem(key, value));
        throw error;
      }
      location.reload();
    } catch (error) {
      setStatus('Import fehlgeschlagen: ' + error.message);
    }
  });
})();
