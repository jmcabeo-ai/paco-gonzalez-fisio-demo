(function () {
  'use strict';

  // Proposed OMNIA commercial tariffs, not provider prices or an active subscription.
  const pricing = {
    setup: 997, standaloneBase: 1370, standaloneAgents: 690,
    whatsapp: 29, growth: 67, textOverage: 0.30, voiceOverage: 0.35,
    days: 22, growthText: 400, growthVoice: 400,
    plans: {
      essential: { name: 'Esencial', price: 97, text: 0, voice: 0, phone: false, ai: false },
      digital: { name: 'Digital', price: 197, text: 300, voice: 100, phone: false, ai: true },
      complete: { name: 'Recepción Completa', price: 297, text: 600, voice: 600, phone: true, ai: true }
    }
  };
  const radios = Array.from(document.querySelectorAll('[name="service-plan"]'));
  const whatsapp = document.getElementById('extra-whatsapp');
  const growth = document.getElementById('extra-growth');
  const daily = document.getElementById('daily-contacts');
  const share = document.getElementById('voice-share');
  const duration = document.getElementById('call-duration');
  if (!radios.length || !whatsapp || !growth || !daily || !share || !duration) return;

  const params = new URLSearchParams(window.location.search);
  const requestedPlan = params.get('plan');
  if (Object.prototype.hasOwnProperty.call(pricing.plans, requestedPlan)) {
    radios.forEach(function (input) { input.checked = input.value === requestedPlan; });
  }
  if (params.has('wa')) whatsapp.checked = params.get('wa') === '1';
  if (params.has('growth')) growth.checked = params.get('growth') === '1';
  [[daily, 'daily'], [share, 'voice'], [duration, 'duration']].forEach(function (item) {
    if (!params.has(item[1])) return;
    const value = Number(params.get(item[1]));
    if (!Number.isFinite(value)) return;
    const minimum = Number(item[0].min);
    const maximum = Number(item[0].max);
    const step = Number(item[0].step);
    item[0].value = String(Math.min(maximum, Math.max(minimum, Math.round(value / step) * step)));
  });

  function euro(value) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always', maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
  }
  function number(value) { return new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(value); }
  function setText(id, value) { document.getElementById(id).textContent = value; }
  function selection() {
    const key = radios.find(function (input) { return input.checked; }).value;
    const plan = pricing.plans[key];
    const totalContacts = Number(daily.value) * pricing.days;
    const voiceContacts = totalContacts * Number(share.value) / 100;
    const text = Math.round(totalContacts - voiceContacts);
    const minutes = Math.ceil(voiceContacts * Number(duration.value));
    const textLimit = plan.text + (growth.checked && plan.ai ? pricing.growthText : 0);
    const voiceLimit = plan.voice + (growth.checked && plan.ai ? pricing.growthVoice : 0);
    const extraText = plan.ai ? Math.max(0, text - textLimit) : 0;
    const extraVoice = plan.ai ? Math.max(0, minutes - voiceLimit) : 0;
    const overage = Math.round((extraText * pricing.textOverage + extraVoice * pricing.voiceOverage) * 100) / 100;
    const monthly = plan.price + (whatsapp.checked ? pricing.whatsapp : 0) + (growth.checked ? pricing.growth : 0);
    return { key: key, plan: plan, text: text, minutes: minutes, textLimit: textLimit, voiceLimit: voiceLimit, extraText: extraText, extraVoice: extraVoice, overage: overage, monthly: monthly };
  }

  function selectionURL() {
    const selected = selection();
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('plan', selected.key);
    url.searchParams.set('wa', whatsapp.checked ? '1' : '0');
    url.searchParams.set('growth', growth.checked ? '1' : '0');
    url.searchParams.set('daily', daily.value);
    url.searchParams.set('voice', share.value);
    url.searchParams.set('duration', duration.value);
    url.hash = 'propuesta';
    return url.href;
  }

  function makePrintDocument(selected) {
    const root = document.getElementById('print-proposal-document');
    root.replaceChildren();
    function append(tag, text, className) {
      const element = document.createElement(tag);
      element.textContent = text;
      if (className) element.className = className;
      root.append(element);
    }
    append('p', 'OMNIA / JONATHAN MARTÍNEZ', 'print-eyebrow');
    append('h1', 'Propuesta para Paco González');
    append('p', 'Centro de Fisioterapia y Entrenamiento · Roquetas de Mar · Simulación comercial');
    append('h2', 'Puesta en marcha: ' + euro(pricing.setup));
    append('p', 'Web personalizada, CRM OMNIA, agenda de fisioterapia y configuración de agentes/canales según el plan elegido. Conexión estándar de hasta cinco agendas de Google Calendar tras validar permisos y estructura. Confirmación, recordatorio, enlace de gestión de cita y avisos internos. Dos rondas de revisión de la web. Dominio estándar primer año hasta 20 €.');
    const standalone = pricing.standaloneBase + (selected.plan.ai ? pricing.standaloneAgents : 0);
    append('p', 'Tarifas propuestas por separado, no un precio anterior: web 790 €' + (selected.plan.ai ? ' + agentes texto/voz 690 €' : '') + ' + agenda y automatizaciones 390 € + configuración CRM 190 € = ' + euro(standalone) + '. Paquete 997 €; diferencia ' + euro(standalone - pricing.setup) + '. Activación según plan.');
    append('p', 'Bonus incluidos: formación de 90 min y guía de uso; una revisión a los 30 días; QR/enlaces y plantilla de solicitud de reseñas. Pago: 50 % al inicio y 50 % al validar la entrega.');
    append('h2', selected.plan.name + ': ' + euro(selected.monthly) + '/mes');
    append('p', 'Plan ' + euro(selected.plan.price) + '/mes' + (whatsapp.checked ? ' + WhatsApp 29 €/mes' : '') + (growth.checked ? ' + Crecimiento 67 €/mes' : '') + '.');
    append('p', selected.plan.ai ? 'Incluye ' + number(selected.textLimit) + ' conversaciones de texto y ' + number(selected.voiceLimit) + ' minutos IA de voz al mes. ' + (selected.plan.phone ? 'Atención telefónica entrante y voz web.' : 'Voz web; atención telefónica no incluida.') : 'Atención humana desde el CRM. Agentes IA sin activar.');
    append('p', 'Alojamiento, CRM, mantenimiento, supervisión de los circuitos incluidos y soporte en días laborables. Ajustes menores: 30 min/mes en Esencial y Digital; 60 min/mes en Completa. Completa incluye revisión mensual de 30 min. Crecimiento añade tres circuitos: reseñas, lista de espera y seguimiento autorizado, más revisión de 30 min/mes. Si ya tienes la revisión de Completa, se amplía a 60 min; no se duplica.');
    append('h2', 'Escenario editable de consumo');
    append('p', number(Number(daily.value)) + ' consultas diarias × 22 días; ' + share.value + ' % por voz, ' + duration.value + ' min de duración. Resultado: ' + number(selected.text) + ' conversaciones de texto y ' + number(selected.minutes) + ' minutos de voz al mes.');
    append('p', selected.plan.ai ? 'Exceso IA estimado: ' + euro(selected.overage) + '/mes, únicamente si se autoriza. Total con ese exceso: ' + euro(selected.monthly + selected.overage) + '/mes, antes de impuestos y consumos de canales.' : 'Este plan no atiende ese volumen por IA; la atención corresponde al equipo.');
    append('h2', 'Condiciones y siguiente paso');
    append('p', 'Impuestos, Meta/WhatsApp, SMS, correo, número y tráfico telefónico aparte según consumo. Renovación del dominio aparte. Cupos OMNIA: sesión de texto de 24 h por contacto/canal, hasta 20 respuestas IA; voz web y teléfono comparten minutos. Exceso autorizado: 0,30 €/conversación y 0,35 €/minuto IA. Aviso previsto al 80 % y pausa/derivación al alcanzar el límite sin autorización.');
    append('p', 'Renovación mensual; baja con 30 días de preaviso. Cuota desde puesta en servicio. Alcance y controles pendientes de validación técnica; integraciones especiales y nuevos desarrollos se presupuestan aparte. La web alojada permanece publicada mientras el servicio esté activo; migración independiente aparte. Esta simulación no contrata ni activa servicios.');
    append('p', 'Ejemplo de 12 meses sin consumos: ' + euro(pricing.setup + selected.monthly * 12) + '. No implica permanencia anual.');
    append('h2', 'Privacidad, seguridad y control');
    append('p', 'La implantación incluye mapa técnico de datos/proveedores, permisos del equipo, minimización, incorporación de avisos y textos aprobados y pruebas. Se coordina con el DPD/asesoría del centro: bases jurídicas, contrato de encargo, garantías de datos sanitarios y transferencias internacionales. Antes de producción se revisarán la obligación de DPD y la necesidad de evaluación de impacto. DPD, auditoría jurídica y evaluación de impacto externa no incluidos.');
    append('p', 'IA administrativa identificada como tal; sin diagnóstico ni solicitud de historias clínicas. Grabación/transcripción solo tras definir información, base jurídica, acceso y conservación. Marketing separado de citas. Ante incidencias se documentarán avisos, recuperación, ejercicio de derechos y devolución/borrado. Sin certificación global de cumplimiento ni SLA 24/7 en esta propuesta. Las medidas y contratos se validan antes de trabajar con pacientes reales.');
    append('p', 'Contacto: jonathan@omniagsistems.com · ' + selectionURL(), 'print-contact');
  }

  function updateQuote() {
    const selected = selection();
    radios.forEach(function (input) { input.closest('.plan-card').classList.toggle('is-selected', input.checked); });
    const standalone = pricing.standaloneBase + (selected.plan.ai ? pricing.standaloneAgents : 0);
    document.getElementById('value-agent-line').hidden = !selected.plan.ai;
    setText('standalone-total', euro(standalone));
    setText('bundle-saving', euro(standalone - pricing.setup) + ' de ahorro');
    setText('daily-output', daily.value);
    setText('share-output', share.value + ' %');
    setText('duration-output', number(Number(duration.value)) + ' min');
    setText('estimated-conversations', number(selected.text));
    setText('estimated-minutes', number(selected.minutes));
    setText('quote-plan-name', selected.plan.name);
    setText('quote-base', euro(selected.plan.price) + '/mes');
    document.getElementById('quote-whatsapp-line').hidden = !whatsapp.checked;
    document.getElementById('quote-growth-line').hidden = !growth.checked;
    setText('quote-monthly', number(selected.monthly));
    setText('quote-year-total', euro(pricing.setup + selected.monthly * 12));
    setText('quote-estimated', euro(selected.monthly + selected.overage) + '/mes');
    setText('quote-overage', selected.plan.ai ? (selected.overage ? euro(selected.overage) + ' de exceso IA estimado si lo autorizas, más consumo de los canales.' : 'Tu escenario entra en el cupo IA. Consumo de los canales aparte.') : 'La cuota no incluye agentes IA; el equipo atiende desde el panel. Consumo de los canales aparte.');
    let fit;
    if (!selected.plan.ai) {
      fit = 'Esencial organiza consultas y avisos con atención humana. Para que un agente atienda por texto o voz, elige Digital o Completa.';
    } else {
      fit = 'Cupo seleccionado: ' + number(selected.textLimit) + ' conversaciones y ' + number(selected.voiceLimit) + ' minutos IA/mes. ';
      fit += selected.overage ? 'Este ejemplo supera el cupo en ' + number(selected.extraText) + ' conversaciones y ' + number(selected.extraVoice) + ' minutos. Puedes ampliar antes de activar o autorizar el exceso estimado.' : 'Este ejemplo cabe en el uso incluido.';
      if (!selected.plan.phone) fit += ' Para atender llamadas telefónicas necesitas Completa.';
    }
    setText('usage-fit', fit);
    document.getElementById('usage-fit').classList.toggle('needs-capacity', Boolean(selected.overage) || !selected.plan.ai);
    const body = 'Hola, Jonathan. He probado la demo del Centro Paco González y quiero revisar esta propuesta:\n\nPuesta en marcha: 997 €.\nPlan: ' + selected.plan.name + '.\nWhatsApp: ' + (whatsapp.checked ? 'sí' : 'no') + '.\nCrecimiento: ' + (growth.checked ? 'sí' : 'no') + '.\nCuota: ' + euro(selected.monthly) + '/mes, antes de impuestos y consumos.\n\nMi selección: ' + selectionURL();
    document.getElementById('proposal-contact').href = 'mailto:jonathan@omniagsistems.com?subject=' + encodeURIComponent('Propuesta Paco González · ' + selected.plan.name) + '&body=' + encodeURIComponent(body);
    setText('proposal-feedback', '');
    makePrintDocument(selected);
  }
  radios.concat([whatsapp, growth]).forEach(function (control) { control.addEventListener('change', updateQuote); });
  [daily, share, duration].forEach(function (control) { control.addEventListener('input', updateQuote); });
  document.getElementById('print-proposal').addEventListener('click', function () { makePrintDocument(selection()); window.print(); });
  document.getElementById('copy-proposal-link').addEventListener('click', async function () {
    const url = selectionURL();
    try {
      await navigator.clipboard.writeText(url);
      setText('proposal-feedback', 'Enlace copiado con tu plan, extras y escenario.');
    } catch (error) {
      // Visible selectable fallback when a device blocks clipboard access.
      const feedback = document.getElementById('proposal-feedback');
      feedback.replaceChildren();
      const label = document.createElement('label');
      label.textContent = 'Copia este enlace:';
      const input = document.createElement('input');
      input.type = 'text'; input.readOnly = true; input.value = url;
      input.setAttribute('aria-label', 'Enlace de tu selección');
      label.append(input); feedback.append(label); input.focus(); input.select();
    }
  });

  // The demo widgets do not contact their providers until explicitly requested.
  const privacyDialog = document.getElementById('demo-privacy');
  const activateButton = document.getElementById('activate-demo');
  const confirmButton = document.getElementById('confirm-demo');
  let widgetsRequested = false;
  function openPrivacy() {
    confirmButton.hidden = widgetsRequested;
    privacyDialog.showModal();
  }
  activateButton.addEventListener('click', openPrivacy);
  document.querySelectorAll('[data-open-privacy]').forEach(function (button) { button.addEventListener('click', openPrivacy); });
  document.querySelectorAll('[data-close-privacy]').forEach(function (button) { button.addEventListener('click', function () { privacyDialog.close(); }); });
  privacyDialog.addEventListener('click', function (event) { if (event.target === privacyDialog) privacyDialog.close(); });
  function loadWidget(id, parent) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = 'https://widgets.leadconnectorhq.com/loader.js';
      script.dataset.resourcesUrl = 'https://widgets.leadconnectorhq.com/chat-widget/loader.js';
      script.dataset.widgetId = id;
      script.onload = resolve;
      script.onerror = reject;
      parent.append(script);
    });
  }
  confirmButton.addEventListener('click', async function () {
    if (widgetsRequested) return;
    widgetsRequested = true;
    privacyDialog.close();
    activateButton.disabled = true;
    activateButton.textContent = 'CARGANDO ASISTENTES…';
    const mount = document.getElementById('voice-widget-mount');
    mount.replaceChildren();
    document.getElementById('stop-demo').hidden = false;
    setText('demo-activation-status', 'Cargando chat y voz. Usa solo datos ficticios.');
    try {
      await loadWidget('6abe41a6cdeb03a6d5b9b175', mount);
      await loadWidget('6abe4375b9739b959273ef08', document.body);
      activateButton.textContent = 'ASISTENTES SOLICITADOS ✓';
      setText('demo-activation-status', 'Abre la burbuja para escribir o el visualizador para hablar. Si no aparecen, desactiva y vuelve a probar con conexión a Internet.');
    } catch (error) {
      activateButton.textContent = 'NO SE PUDO CARGAR';
      setText('demo-activation-status', 'Revisa tu conexión. Desactiva y recarga para volver a intentarlo; no se ha enviado ninguna consulta desde esta página.');
    }
  });
  document.getElementById('stop-demo').addEventListener('click', function () { window.location.reload(); });
  document.querySelector('.monthly-total').setAttribute('aria-live', 'polite');

  if ('IntersectionObserver' in window) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed'); observer.unobserve(entry.target);
        });
      }, { threshold: 0.08 });
      document.querySelectorAll('.review-card,.solution-grid article,.launch-steps article,.bonus-grid article,.care-grid article').forEach(function (element) { element.classList.add('reveal-ready'); observer.observe(element); });
    }
    const mobile = document.querySelector('.mobile-actions');
    const proposalObserver = new IntersectionObserver(function (entries) {
      mobile.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0 });
    proposalObserver.observe(document.getElementById('propuesta'));
  }
  updateQuote();
})();
