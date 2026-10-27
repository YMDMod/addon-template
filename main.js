'use strict';
const fs = require('fs');
const path = require('path');

let timer = null;

module.exports = {
  activate(api) {
    api.log(`activate: аддон ${api.id}, API ${api.apiVersion}, мод ${api.modVersion}, клиент ${api.clientVersion}`);

    const statsFile = path.join(api.dataDir, 'stats.json');
    let stats = { launches: 0 };
    try {
      stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    } catch {
    }
    stats.launches += 1;
    fs.writeFileSync(statsFile, JSON.stringify(stats));

    api.expose({ launches: () => stats.launches });

    api.on('example:ping', (payload) => {
      const win = api.mainWindow();
      api.emit('example:pong', {
        rid: payload && payload.rid,
        electron: process.versions.electron,
        node: process.versions.node,
        launches: api.use('example').launches(),
        dataDir: api.dataDir,
        window: win ? win.getBounds() : null,
        greeting: api.settings.get('greeting'),
        addons: api.diagnostics().addons.map((a) => `${a.id} ${a.status}`),
      });
    });

    api.on('example:flash', () => {
      const win = api.mainWindow();
      if (!win) return;
      win.flashFrame(true);
      setTimeout(() => win.flashFrame(false), 3000);
    });

    api.player.onChange((state) => api.log('player', state.isPlaying ? 'играет' : 'пауза'));
    api.settings.onChange(({ key, value }) => api.log('настройка', key, '=', value));

    timer = setInterval(() => api.emit('example:tick', { at: Date.now() }), 10000);
    api.onDispose(() => {
      clearInterval(timer);
      timer = null;
    });

    api.notify(`Пример: main-часть запущена (${stats.launches}-й раз)`, { type: 'info' });
  },

  deactivate() {
    if (timer) clearInterval(timer);
  },
};
