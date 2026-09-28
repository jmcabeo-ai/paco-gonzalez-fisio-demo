(function () {
  'use strict';

  const services = [
    'Fisioterapia avanzada',
    'Entrenamiento personal',
    'Entrenamiento en grupos',
    'Readaptación de lesiones'
  ];
  const times = ['09:30', '12:00', '17:00', '19:30'];
  const dates = nextWeekdays(5);
  const state = { channel: 'whatsapp', phase: 'start', service: null, date: dates[0], time: null, booking: null, voice: false };
  let demoSequence = 1;
  let skipNextChoice = false;

  const messages = document.getElementById('messages');
  const actions = document.getElementById('quick-actions');
  const agendaDate = document.getElementById('agenda-date');
  const agendaContent = document.getElementById('agenda-content');
  const bookingCount = document.getElementById('booking-count');
  const channelSubtitle = document.getElementById('channel-subtitle');
  const callDisplay = document.getElementById('call-display');
  const voiceToggle = document.getElementById('voice-toggle');

  function nextWeekdays(amount) {
    const result = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    cursor.setDate(cursor.getDate() + 1);
    while (result.length < amount) {
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6) result.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  function dateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function formatDate(date, options) {
    return new Intl.DateTimeFormat('es-ES', options).format(date);
  }

  function addMessage(kind, copy) {
    const item = document.createElement('div');
    item.className = 'message ' + kind;
    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = kind === 'user' ? 'PACIENTE DE PRUEBA' : kind === 'system' ? 'ESTADO DE LA DEMO' : 'ASISTENTE · DEMO';
    const body = document.createElement('p');
    body.textContent = copy;
    item.append(label, body);
    messages.append(item);
    messages.scrollTop = messages.scrollHeight;
    if (kind === 'assistant' && state.channel === 'call' && state.voice && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(copy);
      utterance.lang = 'es-ES';
      utterance.rate = 1.02;
      window.speechSynthesis.speak(utterance);
    }
  }

  function setActions(options) {
    actions.replaceChildren();
    options.forEach(function (option) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option.label;
      if (option.primary) button.classList.add('primary');
      button.addEventListener('click', option.action);
      actions.append(button);
    });
  }

  function userChoice(text) {
    if (skipNextChoice) { skipNextChoice = false; return; }
    addMessage('user', text);
  }

  function showStart() {
    state.phase = 'start';
    setActions([
      { label: 'Buscar cita de ejemplo', primary: true, action: startBooking },
      { label: 'Anular cita de prueba', action: requestCancellation },
      { label: '¿Qué puede hacer?', action: explainDemo }
    ]);
  }

  function explainDemo() {
    userChoice('¿Qué puede hacer?');
    addMessage('assistant', 'Aquí puedes probar un recorrido guiado: consultar horarios ficticios, reservar una cita de prueba, ver una confirmación, simular un recordatorio y anularla. El canal de llamada también puede leer mis respuestas en voz alta si lo activas. No es una IA conectada al centro.');
    if (state.booking) showBookedActions(); else showStart();
  }

  function startBooking() {
    if (state.booking) {
      addMessage('assistant', 'Ya tienes una cita de prueba activa en esta agenda. Puedes anularla primero y después reservar otra; así nunca sustituimos una reserva sin avisarte.');
      showBookedActions();
      return;
    }
    userChoice('Quiero consultar una cita de ejemplo');
    state.phase = 'service';
    addMessage('assistant', 'Claro. ¿Para cuál de estos servicios quieres ver una cita de demostración? Las opciones son los servicios comunicados por el centro; los horarios de esta prueba son inventados.');
    setActions(services.map(function (name) {
      return { label: name, action: function () { chooseService(name); } };
    }));
  }

  function chooseService(name) {
    state.phase = 'date';
    state.service = name;
    state.time = null;
    userChoice(name);
    addMessage('assistant', 'Perfecto. ¿Qué día quieres consultar en la agenda ficticia?');
    const options = dates.map(function (date) {
      return { label: formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' }), action: function () { chooseDate(date); } };
    });
    options.push({ label: 'Volver al inicio', action: showStart });
    setActions(options);
  }

  function chooseDate(date) {
    state.phase = 'time';
    state.date = date;
    userChoice(formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' }));
    addMessage('assistant', 'Para ' + state.service.toLowerCase() + ', esta agenda de prueba propone estos horarios ficticios. No representan disponibilidad del centro. ¿Cuál prefieres?');
    renderAgenda();
    const options = times.filter(function (time) {
      return !state.booking || state.booking.dateKey !== dateKey(date) || state.booking.time !== time;
    }).map(function (time) {
      return { label: time, action: function () { chooseTime(time); } };
    });
    options.push({ label: 'Elegir otro día', action: function () { chooseService(state.service); } });
    setActions(options);
  }

  function chooseTime(time) {
    state.phase = 'confirm';
    state.time = time;
    userChoice(time);
    addMessage('assistant', 'Resumen de la cita de PRUEBA:\n' + state.service + '\n' + formatDate(state.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + time + '\n\n¿Confirmo la reserva en esta agenda ficticia?');
    setActions([
      { label: 'Confirmar cita de prueba', primary: true, action: confirmBooking },
      { label: 'Elegir otro horario', action: function () { chooseDate(state.date); } },
      { label: 'Volver al inicio', action: showStart }
    ]);
  }

  function confirmBooking() {
    if (state.booking && state.booking.dateKey === dateKey(state.date) && state.booking.time === state.time) {
      addMessage('system', 'Ese horario ya está ocupado en la agenda de prueba. Elige otro.');
      chooseDate(state.date);
      return;
    }
    userChoice('Confirmar cita de prueba');
    state.booking = {
      code: 'PG-DEMO-' + String(demoSequence++).padStart(3, '0'),
      service: state.service,
      dateKey: dateKey(state.date),
      date: new Date(state.date),
      time: state.time
    };
    addMessage('assistant', 'Hecho: la cita ficticia ' + state.booking.code + ' queda reservada en esta pantalla para ' + formatDate(state.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ' a las ' + state.time + '. No se ha creado ninguna cita real ni se ha enviado una confirmación externa.');
    addMessage('system', 'CITA DE DEMOSTRACIÓN CONFIRMADA · ' + state.booking.code);
    renderAgenda();
    showBookedActions();
  }

  function showBookedActions() {
    state.phase = 'booked';
    setActions([
      { label: 'Ver recordatorio simulado', primary: true, action: showReminder },
      { label: 'Anular esta cita', action: requestCancellation },
      { label: '¿Qué puede hacer?', action: explainDemo }
    ]);
  }

  function showReminder() {
    if (!state.booking) return;
    userChoice('Muéstrame el recordatorio');
    addMessage('assistant', '⏱ AVANCE DE TIEMPO SIMULADO\nRecordatorio de ejemplo: tienes una cita de prueba para ' + state.booking.service.toLowerCase() + ' el ' + formatDate(state.booking.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ' a las ' + state.booking.time + '. Código ' + state.booking.code + '. Si no puedes asistir, puedes pedir su anulación aquí.\n\nEste recordatorio solo aparece en la demo: no se programa ni se envía.');
    showBookedActions();
  }

  function requestCancellation() {
    userChoice('Quiero anular una cita de prueba');
    if (!state.booking) {
      state.phase = 'no_booking';
      addMessage('assistant', 'Todavía no hay ninguna cita en esta agenda ficticia. Reserva primero una de ejemplo y después podrás probar la cancelación, también cambiando entre WhatsApp y llamada.');
      setActions([{ label: 'Buscar cita de ejemplo', primary: true, action: startBooking }, { label: 'Volver al inicio', action: showStart }]);
      return;
    }
    state.phase = 'cancel_confirm';
    addMessage('assistant', 'Encuentro la cita de prueba ' + state.booking.code + ': ' + state.booking.service + ', ' + formatDate(state.booking.date, { day: 'numeric', month: 'long' }) + ' a las ' + state.booking.time + '. ¿Confirmas que quieres anularla en esta demo?');
    setActions([
      { label: 'Sí, anular cita de prueba', primary: true, action: confirmCancellation },
      { label: 'Mantener la cita', action: function () { userChoice('Mantener la cita'); addMessage('assistant', 'Perfecto. Tu cita ficticia sigue en la agenda de demostración.'); showBookedActions(); } }
    ]);
  }

  function confirmCancellation() {
    if (!state.booking) { showStart(); return; }
    const cancelledCode = state.booking.code;
    userChoice('Sí, anular cita de prueba');
    state.booking = null;
    state.phase = 'start';
    addMessage('assistant', 'La cita ficticia ' + cancelledCode + ' está anulada y el hueco vuelve a estar libre en esta agenda de demostración. No se ha cancelado ninguna cita real ni se ha enviado ningún aviso.');
    addMessage('system', 'CITA DE DEMOSTRACIÓN ANULADA · ' + cancelledCode);
    renderAgenda();
    setActions([
      { label: 'Reservar otra cita de prueba', primary: true, action: startBooking },
      { label: 'Volver al inicio', action: showStart }
    ]);
  }

  function renderAgenda() {
    agendaDate.textContent = formatDate(state.date, { weekday: 'long', day: 'numeric', month: 'long' });
    const subtitle = document.createElement('small');
    subtitle.textContent = 'HORARIOS INVENTADOS · SOLO DEMO';
    agendaDate.append(subtitle);
    agendaContent.replaceChildren();
    if (state.booking) {
      const card = document.createElement('div');
      card.className = 'booking-card';
      const top = document.createElement('small');
      top.textContent = 'RESERVA FICTICIA · ' + state.booking.code;
      const title = document.createElement('strong');
      title.textContent = formatDate(state.booking.date, { day: 'numeric', month: 'short' }) + ' / ' + state.booking.time;
      const detail = document.createElement('span');
      detail.textContent = state.booking.service;
      card.append(top, title, detail);
      agendaContent.append(card);
    }
    const note = document.createElement('p');
    note.className = 'agenda-empty';
    note.textContent = 'Franjas de ejemplo para ' + formatDate(state.date, { weekday: 'long' }) + '. No muestran disponibilidad real.';
    agendaContent.append(note);
    times.forEach(function (time) {
      const line = document.createElement('div');
      const occupied = state.booking && state.booking.dateKey === dateKey(state.date) && state.booking.time === time;
      line.className = 'slot-preview' + (occupied ? ' booked' : '');
      const hour = document.createElement('span');
      hour.textContent = time;
      const status = document.createElement('small');
      status.textContent = occupied ? 'CITA DE PRUEBA' : 'HUECO FICTICIO';
      line.append(hour, status);
      agendaContent.append(line);
    });
    bookingCount.textContent = state.booking ? '01' : '00';
  }

  function switchChannel(channel) {
    if (state.channel === channel) return;
    state.channel = channel;
    document.querySelectorAll('.channel').forEach(function (button) {
      const selected = button.dataset.channel === channel;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    callDisplay.hidden = channel !== 'call';
    channelSubtitle.textContent = channel === 'call' ? 'Simulación de llamada · sin marcar un número' : 'Vista previa de conversación · sin envío real';
    if (channel !== 'call' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    addMessage('system', channel === 'call' ? 'CANAL CAMBIADO A LLAMADA SIMULADA · NO SE MARCA NINGÚN NÚMERO' : 'CANAL CAMBIADO A WHATSAPP SIMULADO · NO SE ENVÍAN MENSAJES');
    addMessage('assistant', state.booking ? 'Seguimos con tu cita de prueba ' + state.booking.code + '. Puedes ver el recordatorio o anularla desde este canal simulado.' : 'Seguimos desde aquí. ¿Quieres consultar una cita de ejemplo?');
    if (state.booking) showBookedActions(); else showStart();
  }

  function normalize(value) {
    return value.toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function handleTypedMessage(raw) {
    const value = normalize(raw);
    addMessage('user', raw);
    skipNextChoice = true;
    let action = null;

    if (state.phase === 'service') {
      const chosen = services.find(function (service) {
        const key = normalize(service);
        return value.includes(key) || (key.includes('fisioterapia') && value.includes('fisio')) ||
          (key.includes('personal') && value.includes('personal')) ||
          (key.includes('grupos') && value.includes('grupo')) ||
          (key.includes('readaptacion') && (value.includes('readapta') || value.includes('lesion')));
      });
      if (chosen) action = function () { chooseService(chosen); };
    } else if (state.phase === 'date') {
      let selected = null;
      if (/^[1-5]$/.test(value)) selected = dates[Number(value) - 1];
      if (!selected) selected = dates.find(function (date) {
        return value.includes(normalize(formatDate(date, { weekday: 'long' }))) || value === String(date.getDate());
      });
      if (selected) action = function () { chooseDate(selected); };
    } else if (state.phase === 'time') {
      const typedTime = value.replace('.', ':');
      const selected = times.find(function (time) {
        return typedTime.includes(time) || typedTime === String(Number(time.slice(0, 2)));
      });
      if (selected) action = function () { chooseTime(selected); };
    } else if (state.phase === 'confirm') {
      if (/^(si|sí|confirmar|confirmo|vale|ok|adelante)/.test(value)) action = confirmBooking;
      else if (value.includes('otro') || value.includes('cambiar')) action = function () { chooseDate(state.date); };
    } else if (state.phase === 'cancel_confirm') {
      if (/^(si|sí|anular|confirmar|confirmo|vale)/.test(value)) action = confirmCancellation;
      else if (value.includes('no') || value.includes('mantener')) action = function () { addMessage('assistant', 'Perfecto. Tu cita ficticia sigue en la agenda de demostración.'); showBookedActions(); };
    }

    if (!action && (value.includes('anular') || value.includes('cancelar'))) action = requestCancellation;
    if (!action && value.includes('recordatorio')) action = state.booking ? showReminder : function () { addMessage('assistant', 'Primero reserva una cita de prueba para poder ver su recordatorio simulado.'); showStart(); };
    if (!action && (value.includes('cita') || value.includes('reservar') || value.includes('horario') || value.includes('disponibilidad'))) action = startBooking;
    if (!action && (value.includes('ayuda') || value.includes('hacer') || value.includes('funciona'))) action = explainDemo;

    if (action) action();
    else addMessage('assistant', 'Esta demostración usa un recorrido guiado. Prueba con las opciones de abajo o escribe «quiero una cita», «recordatorio» o «anular». No compartas datos personales o de salud aquí.');
    skipNextChoice = false;
  }

  function restartDemo() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    state.booking = null;
    state.service = null;
    state.time = null;
    state.date = dates[0];
    demoSequence = 1;
    messages.replaceChildren();
    addMessage('assistant', 'Demo reiniciada. Hola, soy la recepción de demostración del Centro de Fisioterapia y Entrenamiento Paco González. ¿Qué te gustaría probar?');
    renderAgenda();
    showStart();
  }

  document.querySelectorAll('.channel').forEach(function (button) {
    button.addEventListener('click', function () { switchChannel(button.dataset.channel); });
  });
  document.getElementById('restart-demo').addEventListener('click', restartDemo);
  document.getElementById('message-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const input = document.getElementById('demo-input');
    const value = input.value.trim();
    if (!value) return;
    input.value = '';
    handleTypedMessage(value);
  });
  voiceToggle.addEventListener('click', function () {
    if (!('speechSynthesis' in window)) {
      addMessage('system', 'La lectura en voz alta no está disponible en este navegador. Puedes seguir usando los botones.');
      return;
    }
    state.voice = !state.voice;
    voiceToggle.textContent = state.voice ? 'DESACTIVAR VOZ' : 'ACTIVAR VOZ';
    voiceToggle.setAttribute('aria-pressed', String(state.voice));
    if (!state.voice) window.speechSynthesis.cancel();
    else addMessage('assistant', 'Voz activada para esta llamada de demostración. No se ha realizado ninguna llamada real.');
  });

  renderAgenda();
  showStart();
})();
