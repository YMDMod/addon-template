module.exports = {
  start(ymd) {
    ymd.log('start', ymd.id, 'API', ymd.apiVersion);

    ymd.addStyle(`
#ymd-overlay .ex-grid{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;font-size:13px}
#ymd-overlay .ex-grid dt{color:var(--ymd-dim)}
#ymd-overlay .ex-grid dd{margin:0;word-break:break-all}
#ymd-overlay .ex-buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
#ymd-overlay .ex-title{font-weight:600;margin-bottom:6px}
#ymd-overlay .ex-pre{font:12px/1.4 Consolas,monospace;white-space:pre-wrap;color:var(--ymd-dim);margin-top:8px}
.ex-dot{display:inline-block;border-radius:50%;margin-left:6px;vertical-align:middle;pointer-events:none}
`);

    ymd.expose({
      greeting: () => ymd.settings.get('greeting'),
    });

    const DOT_COLORS = { accent: '#ffd23f', green: '#3cbe64', red: '#e64646' };
    const paintDot = (dot) => {
      const size = Number(ymd.settings.get('dotSize')) || 6;
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.background = DOT_COLORS[ymd.settings.get('dotColor')] || DOT_COLORS.accent;
      dot.hidden = !ymd.settings.get('markNav');
    };
    ymd.dom.each('[data-test-id^="NAVBAR_NAVIGATION_ITEM_"]', (item) => {
      const label = item.querySelector('span') || item;
      if (label.querySelector('.ex-dot')) return;
      const dot = document.createElement('span');
      dot.className = 'ex-dot';
      paintDot(dot);
      label.append(dot);
    });
    ymd.onDispose(() => document.querySelectorAll('.ex-dot').forEach((dot) => dot.remove()));
    ymd.settings.onChange(() => document.querySelectorAll('.ex-dot').forEach(paintDot));

    const onKey = ymd.guard((event) => {
      if (event.ctrlKey && event.altKey && event.code === 'KeyE') ymd.notify(ymd.settings.get('greeting'));
    });
    document.addEventListener('keydown', onKey);
    ymd.onDispose(() => document.removeEventListener('keydown', onKey));

    const el = (tag, props = {}, children = []) => {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(props)) {
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
      }
      for (const child of [].concat(children)) if (child) node.append(child);
      return node;
    };
    const button = (text, onclick, accent) => el('button', { class: `ymd-btn${accent ? ' ymd-btn-accent' : ''}`, type: 'button', text, onclick });
    const card = (title, ...children) => el('div', { class: 'ymd-card' }, [el('div', { class: 'ex-title', text: title }), ...children]);
    const grid = (rows) => el('dl', { class: 'ex-grid' }, rows.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: String(v) })]));

    const versionsCard = () => card('Версии', grid([
      ['ymd.id', ymd.id],
      ['ymd.apiVersion', ymd.apiVersion],
      ['ymd.modVersion', ymd.modVersion],
      ['ymd.clientVersion', ymd.clientVersion],
    ]));

    const settingsCard = (cleanup) => {
      const box = el('div');
      const show = () => box.replaceChildren(grid(Object.entries(ymd.settings.all())));
      show();
      cleanup.push(ymd.settings.onChange(show));
      return card('Настройки: settings.all / set / onChange', box, el('div', { class: 'ex-buttons' }, [
        button('Переключить точки', () => ymd.settings.set('markNav', !ymd.settings.get('markNav'))),
        button('Точка крупнее', () => ymd.settings.set('dotSize', (Number(ymd.settings.get('dotSize')) || 6) + 2)),
        button('Сбросить размер', () => ymd.settings.set('dotSize', 6)),
      ]));
    };

    const notificationsCard = () => {
      const progressDemo = () => {
        const toasts = ymd.use('notifications');
        if (!toasts) return;
        const bar = toasts.progress('Загрузка', 0, { title: 'Пример' });
        let value = 0;
        const step = () => {
          value = Math.min(1, value + 0.2);
          bar.update(value < 1 ? { text: `Загрузка ${Math.round(value * 100)}%`, progress: value } : { text: 'Готово', progress: 1 });
          if (value < 1) ymd.setTimeout(step, 500);
        };
        ymd.setTimeout(step, 500);
      };
      const stickyDemo = () => {
        const toasts = ymd.use('notifications');
        if (!toasts) return;
        const note = toasts.info('Закроется через 2 секунды из кода', { title: 'Пример', sticky: true });
        ymd.setTimeout(() => note.close(), 2000);
      };
      const actionsDemo = () => {
        ymd.use('notifications')?.show({
          title: 'Пример',
          text: 'Уведомление с кнопками висит, пока не нажмут кнопку или не закроют.',
          sticky: true,
          actions: [
            { label: 'Поздороваться', primary: true, onClick: () => ymd.notify(ymd.settings.get('greeting'), { type: 'success' }) },
            { label: 'Закрыть' },
          ],
        });
      };
      return card('Уведомления: ymd.notify и ymd.use(\'notifications\')', el('div', { class: 'ex-buttons' }, [
        button('notify', () => ymd.notify(ymd.settings.get('greeting'))),
        button('success', () => ymd.use('notifications')?.success('Получилось')),
        button('error', () => ymd.use('notifications')?.error('Что-то пошло не так')),
        button('progress', progressDemo, true),
        button('sticky + close()', stickyDemo),
        button('actions', actionsDemo),
      ]), el('div', { class: 'ymd-desc', text: 'Ctrl+Alt+E в любом месте клиента — приветствие (обработчик через ymd.guard).' }));
    };

    const exposeCard = () => card('Библиотеки: dependencies, ymd.expose / ymd.use', grid([
      ['dependencies в manifest.json', '{ "notifications": ">=0.3.0" } — без неё аддон не запустится'],
      ["ymd.use('notifications')", Object.keys(ymd.use('notifications') || {}).join(', ') || 'null'],
      ["ymd.use('notifications', '>=99.0.0')", String(ymd.use('notifications', '>=99.0.0'))],
      ["ymd.use('example').greeting()", ymd.use('example')?.greeting()],
      ["ymd.use('missing')", String(ymd.use('missing'))],
    ]));

    const busCard = (cleanup) => {
      const replyBox = el('div', { class: 'ex-pre', text: 'Нажмите «Пинг main».' });
      const tickBox = el('div', { class: 'ymd-desc', text: 'Тик от main: ждём…' });
      let rid = null;
      cleanup.push(ymd.on('example:pong', (reply) => {
        if (reply && reply.rid === rid) replyBox.textContent = JSON.stringify(reply, null, 2);
      }));
      cleanup.push(ymd.on('example:tick', ({ at }) => {
        tickBox.textContent = `Тик от main: ${new Date(at).toLocaleTimeString()}`;
      }));
      return card('Шина: emit / on и main-часть', el('div', { class: 'ex-buttons' }, [
        button('Пинг main', () => {
          rid = String(Math.random());
          ymd.emit('example:ping', { rid });
        }, true),
        button('Мигнуть в панели задач', () => ymd.emit('example:flash')),
      ]), tickBox, replyBox);
    };

    const crashCard = () => card('Падение аддона',
      el('div', { class: 'ymd-desc', text: 'Аддон отключится до перезапуска клиента или до включения переключателем на вкладке «Аддоны».' }),
      el('div', { class: 'ex-buttons' }, [button('Уронить аддон', ymd.guard(() => {
        throw new Error('Проверка: аддон упал нарочно');
      }))]));

    ymd.ui.addPage({
      id: 'main',
      title: 'Пример',
      render(container) {
        const cleanup = [];
        container.append(
          versionsCard(),
          settingsCard(cleanup),
          notificationsCard(),
          exposeCard(),
          busCard(cleanup),
          crashCard(),
        );
        return () => cleanup.forEach((off) => off());
      },
    });
  },

  stop() {},
};
