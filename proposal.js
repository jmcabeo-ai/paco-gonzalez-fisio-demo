(function () {
  'use strict';

  // OMNIA proposal only: selecting a plan never activates subscriptions or channels.
  const pricing = {
    setup: 997, standalone: 2060, textOverage: 0.30, voiceOverage: 0.27, days: 22,
    voiceBundles: {
      none: { minutes: 0, price: 0 },
      '200': { minutes: 200, price: 50 },
      '500': { minutes: 500, price: 110 },
      '1000': { minutes: 1000, price: 200 }
    },
    plans: {
      initial: { name: 'Recepción IA Inicial', price: 197, text: 300, voice: 100, unlimited: false, adjustments: 30, review: 0 },
      complete: { name: 'Recepción IA', price: 297, text: 600, voice: 600, unlimited: false, adjustments: 60, review: 30 },
      elite: { name: 'Recepción IA + Crecimiento', price: 597, text: null, voice: null, unlimited: true, adjustments: 60, review: 60 }
    }
  };
  const radios = Array.from(document.querySelectorAll('[name="service-plan"]'));
  const bundleRadios = Array.from(document.querySelectorAll('[name="voice-bundle"]'));
  const daily = document.getElementById('daily-contacts');
  const share = document.getElementById('voice-share');
  const duration = document.getElementById('call-duration');
  if (!radios.length || !bundleRadios.length || !daily || !share || !duration) return;

  const params = new URLSearchParams(window.location.search);
  const requestedPlan = params.get('plan');
  const normalizedPlan = requestedPlan === 'digital' ? 'initial' : requestedPlan;
  if (Object.prototype.hasOwnProperty.call(pricing.plans, normalizedPlan)) {
    radios.forEach(function (input) { input.checked = input.value === normalizedPlan; });
  }
  const legacy = document.getElementById('legacy-selection');
  if ((requestedPlan && !Object.prototype.hasOwnProperty.call(pricing.plans, requestedPlan)) || params.get('growth') === '1') {
    legacy.hidden = false;
    legacy.textContent = 'La oferta se ha actualizado a tres planes, todos con llamadas telefónicas entrantes. Esta selección antigua se ha actualizado: revisa el plan y la cuota. Crecimiento ya no se cobra como suplemento; WhatsApp está incluido. No se ha contratado ni cobrado nada.';
  }
  // Legacy wa=0/1 never removes the included channel or adds a separate charge.
  const requestedBundle = params.get('bundle');
  if ((!requestedPlan || Object.prototype.hasOwnProperty.call(pricing.plans, requestedPlan)) && Object.prototype.hasOwnProperty.call(pricing.voiceBundles, requestedBundle)) {
    bundleRadios.forEach(function (input) { input.checked = input.value === requestedBundle; });
  }
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
    const bundleKey = plan.unlimited ? 'none' : bundleRadios.find(function (input) { return input.checked; }).value;
    const bundle = pricing.voiceBundles[bundleKey];
    const totalContacts = Number(daily.value) * pricing.days;
    const voiceContacts = totalContacts * Number(share.value) / 100;
    const text = Math.round(totalContacts - voiceContacts);
    const minutes = Math.ceil(voiceContacts * Number(duration.value));
    const textLimit = plan.text;
    const voiceLimit = plan.unlimited ? null : plan.voice + bundle.minutes;
    const extraText = plan.unlimited ? 0 : Math.max(0, text - textLimit);
    const extraVoice = plan.unlimited ? 0 : Math.max(0, minutes - voiceLimit);
    const overage = Math.round((extraText * pricing.textOverage + extraVoice * pricing.voiceOverage) * 100) / 100;
    const monthly = plan.price + bundle.price;
    return { key: key, plan: plan, bundleKey: bundleKey, bundle: bundle, text: text, minutes: minutes, textLimit: textLimit, voiceLimit: voiceLimit, extraText: extraText, extraVoice: extraVoice, overage: overage, monthly: monthly };
  }
  function selectionURL() {
    const selected = selection();
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('plan', selected.key);
    if (!selected.plan.unlimited) url.searchParams.set('bundle', selected.bundleKey);
    url.searchParams.set('daily', daily.value);
    url.searchParams.set('voice', share.value);
    url.searchParams.set('duration', duration.value);
    url.hash = 'propuesta';
    return url.href;
  }
  function ratesText() {
    return 'Voz IA: ' + euro(pricing.voiceOverage) + '/min · Texto IA: ' + euro(pricing.textOverage) + '/conversación';
  }
  function overageDetails(selected) {
    const lines = [];
    if (selected.extraVoice) lines.push(number(selected.extraVoice) + ' min extra × ' + euro(pricing.voiceOverage) + ' = ' + euro(Math.round(selected.extraVoice * pricing.voiceOverage * 100) / 100));
    if (selected.extraText) lines.push(number(selected.extraText) + ' conversaciones extra × ' + euro(pricing.textOverage) + ' = ' + euro(Math.round(selected.extraText * pricing.textOverage * 100) / 100));
    return lines.join(' · ');
  }
  function bundleSelection(selected) {
    if (selected.plan.unlimited) return 'Este plan no necesita bonos y no cobra exceso de IA. Uso razonable y consumos externos aparte.';
    if (!selected.bundle.minutes) return 'Sin bono: ' + number(selected.plan.voice) + ' minutos IA incluidos; exceso autorizado a ' + euro(pricing.voiceOverage) + '/min.';
    return 'Bono de ' + number(selected.bundle.minutes) + ' minutos: +' + euro(selected.bundle.price) + '/mes (' + euro(selected.bundle.price / selected.bundle.minutes) + '/min). Cupo total: ' + number(selected.plan.voice) + ' del plan + ' + number(selected.bundle.minutes) + ' del bono = ' + number(selected.voiceLimit) + ' minutos IA/mes. Exceso posterior autorizado a ' + euro(pricing.voiceOverage) + '/min.';
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
    append('p', 'Centro de Fisioterapia y Entrenamiento · Roquetas de Mar · Simulación comercial. Ningún servicio se activa desde esta página.');
    append('h2', 'Puesta en marcha: ' + euro(pricing.setup) + ' + IVA, una sola vez');
    append('p', 'Web personalizada y móvil, CRM OMNIA, asistentes de texto y voz y agenda de fisioterapia. Configuración estándar de hasta cinco agendas de Google Calendar tras validar permisos, estructura y reglas. Chat de texto web, un número de WhatsApp y atención de voz por llamadas telefónicas entrantes. El micrófono de esta demo no forma parte de la web final. Confirmación, recordatorio y avisos al equipo. Reservas, cambios, cancelaciones y derivación se prueban antes de conectar producción. Dos revisiones de la web. Dominio estándar primer año hasta 20 €.');
    append('p', 'Tarifas propuestas por separado, no un precio anterior: web 790 € + agentes texto/voz 690 € + agenda y automatizaciones 390 € + CRM 190 € = ' + euro(pricing.standalone) + '. Paquete 997 €; diferencia ' + euro(pricing.standalone - pricing.setup) + '. Antes de IVA.');
    append('p', 'Bonus: formación de 90 min y guía, revisión a los 30 días y kit de QR/enlaces con plantilla de reseñas. Permisos y avisos aprobados, pruebas y validación previa al arranque. 50 % al inicio y 50 % al validar la entrega.');
    append('h2', selected.plan.name + ': ' + euro(selected.monthly) + '/mes + IVA');
    append('p', 'Plan ' + euro(selected.plan.price) + '/mes, canal WhatsApp incluido (un número, sin suplemento fijo)' + (selected.bundle.minutes ? ' + bono de voz ' + number(selected.bundle.minutes) + ' min: ' + euro(selected.bundle.price) + '/mes' : '') + '. Telefonía, mensajes de Meta y procesamiento, SMS y correo facturables aparte.');
    append('p', 'Atención administrativa por chat de texto web, WhatsApp y llamadas telefónicas entrantes; reservas y gestión de citas tras validación, confirmaciones y recordatorios. Web, alojamiento, CRM, mantenimiento correctivo y soporte en días laborables. Hasta ' + number(selected.plan.adjustments) + ' min de ajustes menores por mes, sin acumulación. ' + (selected.plan.review ? 'Revisión mensual de hasta ' + number(selected.plan.review) + ' min.' : 'Sin revisión mensual de optimización.') + ' La IA no diagnostica ni prescribe.');
    if (selected.plan.unlimited) {
      append('p', 'Sin nuestros cupos comerciales de conversaciones o minutos IA; sin bonos ni cargos por exceso de IA de atención compatible. Uso ordinario de un solo centro, sujeto a uso razonable, disponibilidad y límites técnicos del proveedor. No equivale a llamadas simultáneas, desarrollos ni soporte humano ilimitados. Un uso abusivo puede sufrir restricciones; cambios de condiciones se revisan antes de renovar.');
      append('p', 'Crecimiento incluido en los 597 €, no como suplemento: tres circuitos de reseñas sin seleccionar por satisfacción, lista de espera y seguimiento administrativo autorizado. Revisión y optimización mensual de hasta 60 min. Telefonía y Meta siguen aparte. No incluye llamadas comerciales salientes ni llamadas por WhatsApp.');
      append('p', 'Condiciones actuales de IA: https://help.gohighlevel.com/support/solutions/articles/155000003906-ai-employee-overview', 'print-contact');
    } else {
      append('p', 'Incluye ' + number(selected.textLimit) + ' conversaciones de texto y ' + number(selected.voiceLimit) + ' minutos IA de llamadas al mes. Web/WhatsApp comparten texto; los minutos son para llamadas telefónicas entrantes. El micrófono se usa solo en la demo. Reseñas, lista de espera y seguimiento automatizados son parte del plan superior, no de este plan.');
      append('p', bundleSelection(selected));
      append('h2', 'Consumos y condiciones: ' + selected.plan.name);
      append('p', ratesText() + '. Solo exceso autorizado tras el cupo total. Precios antes de IVA; consumos externos aparte.');
      append('p', 'Bonos mensuales opcionales de voz: ' + Object.keys(pricing.voiceBundles).filter(function (key) { return key !== 'none'; }).map(function (key) { const bundle = pricing.voiceBundles[key]; return number(bundle.minutes) + ' min por ' + euro(bundle.price) + '/mes (' + euro(bundle.price / bundle.minutes) + '/min)'; }).join('; ') + '. Un único bono, facturado completo aunque uses menos, sin acumulación de saldo. No incluye texto. No se aplica al plan de 597 €.');
      append('p', 'Cupo OMNIA: sesión de texto de 24 h por contacto/canal, hasta 20 respuestas IA. Aviso previsto al 80 % y pausa/derivación al límite sin autorización. Medición y controles se verifican antes de producción.');
    }
    append('h2', 'Escenario opcional de uso IA, no una previsión clínica');
    append('p', number(Number(daily.value)) + ' consultas diarias × 22 días; ' + share.value + ' % por llamada, ' + duration.value + ' min de duración. Ejemplo: ' + number(selected.text) + ' conversaciones de texto y ' + number(selected.minutes) + ' minutos IA de llamadas al mes.');
    if (selected.plan.unlimited) {
      append('p', 'El ejemplo no añade cargos de IA: cuota ' + euro(selected.monthly) + '/mes + IVA. Uso razonable. No estima telefonía, Meta ni otros consumos externos.');
    } else {
      append('p', 'Exceso IA estimado si lo autorizas: ' + euro(selected.overage) + '/mes. Cuota + ese exceso: ' + euro(selected.monthly + selected.overage) + '/mes, antes de IVA y consumos externos.');
      if (selected.overage) append('p', 'Desglose del exceso estimado: ' + overageDetails(selected) + '.');
    }
    append('h2', 'WhatsApp incluido: mensajes y plantillas');
    const meta = document.getElementById('whatsapp-costes');
    append('p', meta.querySelector('.meta-intro').textContent);
    const metaTable = meta.querySelector('table').cloneNode(true);
    metaTable.className = 'print-meta-table';
    root.append(metaTable);
    ['.meta-policy', '.meta-examples p', '.meta-templates p', '.meta-billing', '.meta-separation'].forEach(function (selector) { append('p', meta.querySelector(selector).textContent); });
    append('p', 'Plantillas básicas dentro de la puesta en marcha, sujetas a aprobación de Meta. Canal incluido en los tres planes; activación tras validar titularidad y requisitos.');
    meta.querySelectorAll('.meta-sources a').forEach(function (source) { append('p', source.textContent + ' ' + source.href, 'print-contact'); });
    append('p', 'Tarifas comprobadas el 01/10/2026, sujetas a cambios del proveedor.');
    append('h2', 'Condiciones y siguiente paso');
    document.querySelectorAll('.service-conditions p').forEach(function (paragraph) { append('p', paragraph.textContent); });
    append('p', 'No incluye campañas nuevas, llamadas comerciales salientes ni llamadas por WhatsApp. Entrenamiento fuera de la agenda inicial. El alcance final, licencia y facturación se validan antes de contratar.');
    append('p', 'Ejemplo de 12 meses con la misma selección: ' + euro(pricing.setup + selected.monthly * 12) + ', sin IVA, excesos ni consumos externos. ' + (selected.bundle.minutes ? 'Incluye el bono mensual elegido. ' : '') + 'No implica permanencia anual.');
    append('h2', 'Privacidad, seguridad y control');
    append('p', 'Implantación técnica de permisos, minimización, mapa de datos/proveedores y avisos/textos aprobados. Coordinación con el DPD/asesoría del centro para bases jurídicas, contrato de encargo, datos sanitarios, transferencias y riesgos. Revisar obligación de DPD y necesidad de evaluación de impacto antes de producción. DPD, auditoría jurídica y evaluación de impacto externa no incluidos.');
    append('p', 'IA administrativa identificada como tal, sin diagnóstico ni solicitud de historias clínicas. Grabación/transcripción tras definir información, base jurídica, acceso y conservación. Marketing separado de citas. Documentar incidencias, recuperación, derechos y devolución/borrado. Sin certificación global de cumplimiento ni SLA humano 24/7. Validación previa al uso de pacientes reales.');
    append('p', 'Contacto: jonathan@omniagsistems.com · ' + selectionURL(), 'print-contact');
  }

  function updateQuote() {
    const selected = selection();
    radios.forEach(function (input) { input.closest('.plan-card').classList.toggle('is-selected', input.checked); });
    bundleRadios.forEach(function (input) {
      input.disabled = selected.plan.unlimited && input.value !== 'none';
      input.checked = input.value === selected.bundleKey;
      input.closest('.voice-bundle-card').classList.toggle('is-selected', input.checked);
    });
    document.getElementById('limited-consumption').hidden = selected.plan.unlimited;
    document.getElementById('unlimited-terms').hidden = !selected.plan.unlimited;
    document.getElementById('quote-unlimited').hidden = !selected.plan.unlimited;
    document.getElementById('quote-unit-rates').hidden = selected.plan.unlimited;
    document.getElementById('quote-growth-line').hidden = !selected.plan.unlimited;
    document.getElementById('quote-bundle-line').hidden = !selected.bundle.minutes;
    document.getElementById('quote-overage-detail').hidden = !selected.overage;
    Object.keys(pricing.voiceBundles).filter(function (key) { return key !== 'none'; }).forEach(function (key) {
      const bundle = pricing.voiceBundles[key];
      setText('bundle-' + key + '-price', '+' + euro(bundle.price));
      setText('bundle-' + key + '-rate', euro(bundle.price / bundle.minutes) + '/min');
    });
    setText('bundle-none-rate', euro(pricing.voiceOverage) + '/min fuera del cupo');
    setText('bundle-selection', bundleSelection(selected));
    setText('standalone-total', euro(pricing.standalone));
    setText('bundle-saving', euro(pricing.standalone - pricing.setup) + ' de ahorro');
    setText('daily-output', daily.value);
    setText('share-output', share.value + ' %');
    setText('duration-output', number(Number(duration.value)) + ' min');
    setText('estimated-conversations', number(selected.text));
    setText('estimated-minutes', number(selected.minutes));
    setText('quote-plan-name', selected.plan.name);
    setText('quote-base', euro(selected.plan.price) + '/mes');
    setText('quote-support', number(selected.plan.adjustments) + ' min de ajustes/mes' + (selected.plan.review ? ' + revisión mensual de ' + number(selected.plan.review) + ' min.' : '. Sin revisión mensual de optimización.') + ' Voz por llamadas entrantes; micrófono solo de demostración.');
    setText('quote-bundle-name', 'Bono llamadas · ' + number(selected.bundle.minutes) + ' min');
    setText('quote-bundle-price', euro(selected.bundle.price) + '/mes');
    setText('quote-monthly', number(selected.monthly));
    setText('quote-year-total', euro(pricing.setup + selected.monthly * 12));
    setText('quote-year-description', 'Alta + 12 cuotas' + (selected.bundle.minutes ? ', incluido el bono elegido' : '') + '. Sin IVA, excesos ni consumos externos; no implica permanencia anual.');
    setText('quote-estimated', euro(selected.monthly + selected.overage) + '/mes');
    setText('quote-overage', selected.plan.unlimited ? 'Este ejemplo no añade cargos de IA. Uso razonable; telefonía, Meta y otros consumos externos aparte.' : (selected.overage ? euro(selected.overage) + ' de exceso IA estimado si lo autorizas. IVA y consumos externos aparte.' : 'Tu escenario entra en el cupo IA. IVA y consumos externos aparte.'));
    setText('voice-unit-price', euro(pricing.voiceOverage));
    setText('text-unit-price', euro(pricing.textOverage));
    setText('quote-rates', ratesText());
    setText('quote-overage-detail', overageDetails(selected));
    setText('plan-consumption-note', selected.plan.unlimited ? 'Sin nuestros cupos, bonos ni cargos por exceso de IA. Uso razonable para un solo centro; telefonía y Meta aparte.' : selected.plan.name + ': exceso autorizado a 0,27 €/min IA de llamada y 0,30 €/conversación, después del cupo. Bonos de llamadas opcionales en el detalle.');
    const counting = selected.plan.unlimited ?
      'Sin cupos comerciales de texto ni minutos IA de OMNIA para la atención administrativa compatible del centro. Uso razonable, disponibilidad y límites técnicos del proveedor. No garantiza llamadas simultáneas ilimitadas ni soporte o desarrollos sin límite. Telefonía, Meta, SMS y correo por consumo aparte; no se estiman aquí. Licencia y condiciones se validan antes de producción.' :
      'Una conversación de texto agrupa una sesión de 24 horas por contacto y canal, hasta 20 respuestas IA. Web/WhatsApp comparten el cupo de ' + number(selected.plan.text) + '; el plan incluye ' + number(selected.plan.voice) + ' minutos IA de llamadas telefónicas entrantes. El micrófono es solo una herramienta de la demo, no de producción. Un único bono mensual suma minutos de llamadas, no texto; se factura completo sin acumular saldo. Exceso autorizado: 0,30 €/conversación y 0,27 €/minuto IA. Aviso previsto al 80 % y control al límite, validados antes de producción. Número y tráfico telefónico, Meta, SMS y correo aparte; la simulación no los estima.';
    setText('usage-counting-terms', counting);
    let fit;
    if (selected.plan.unlimited) {
      fit = 'Sin cupos IA de OMNIA: la cuota del ejemplo sigue en 597 €/mes + IVA. Sujeto a uso razonable; no incluye consumos externos ni garantiza capacidad simultánea ilimitada.';
    } else {
      fit = 'Cupo seleccionado: ' + number(selected.textLimit) + ' conversaciones y ' + number(selected.voiceLimit) + ' minutos IA/mes. ';
      fit += selected.overage ? 'Este ejemplo supera el cupo en ' + number(selected.extraText) + ' conversaciones y ' + number(selected.extraVoice) + ' minutos. Puedes elegir un bono de voz, autorizar el exceso o valorar el plan superior. No se cobra nada automáticamente.' : 'Este ejemplo cabe en el uso incluido.';
    }
    setText('usage-fit', fit);
    document.getElementById('usage-fit').classList.toggle('needs-capacity', Boolean(selected.overage));
    const body = 'Hola, Jonathan. He probado la demo del Centro Paco González y quiero revisar esta propuesta:\n\nPuesta en marcha: 997 € + IVA, una vez.\nPlan: ' + selected.plan.name + '.\nWhatsApp: canal incluido en la cuota; Meta y procesamiento por consumo aparte.\n' +
      (selected.plan.unlimited ? 'IA: sin nuestros cupos, bonos ni cargos por exceso, bajo uso razonable. Crecimiento incluido en la cuota.\n' : 'IA: ' + number(selected.textLimit) + ' conversaciones y ' + number(selected.voiceLimit) + ' minutos/mes. Bono: ' + (selected.bundle.minutes ? number(selected.bundle.minutes) + ' min por ' + euro(selected.bundle.price) + '/mes' : 'sin bono') + '.\nExceso IA del ejemplo, solo si se autoriza: ' + euro(selected.overage) + '/mes.\n') +
      'Cuota: ' + euro(selected.monthly) + '/mes + IVA. Voz por llamadas telefónicas entrantes; el micrófono es solo para la demo. Telefonía, Meta y otros consumos externos aparte.\n\nMi selección: ' + selectionURL();
    document.getElementById('proposal-contact').href = 'mailto:jonathan@omniagsistems.com?subject=' + encodeURIComponent('Propuesta Paco González · ' + selected.plan.name) + '&body=' + encodeURIComponent(body);
    setText('proposal-feedback', '');
    makePrintDocument(selected);
  }
  radios.concat(bundleRadios).forEach(function (control) { control.addEventListener('change', updateQuote); });
  [daily, share, duration].forEach(function (control) { control.addEventListener('input', updateQuote); });
  document.getElementById('print-proposal').addEventListener('click', function () { makePrintDocument(selection()); window.print(); });
  document.getElementById('copy-proposal-link').addEventListener('click', async function () {
    const url = selectionURL();
    try {
      await navigator.clipboard.writeText(url);
      setText('proposal-feedback', 'Enlace copiado con tu plan y escenario opcional.');
    } catch (error) {
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

  // Deep links reveal nested terms without making them part of the main choice.
  function revealTarget(hash) {
    let id;
    try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch (error) { return null; }
    let target = document.getElementById(id);
    if (!target) return null;
    const limited = target.closest('#limited-consumption');
    if (limited && limited.hidden) target = document.getElementById('unlimited-terms');
    let ancestor = target;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    return target;
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () { revealTarget(link.getAttribute('href')); });
  });
  window.addEventListener('hashchange', function () {
    const target = revealTarget(window.location.hash);
    if (target) target.scrollIntoView({ block: 'start' });
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
  if (selection().bundle.minutes) document.getElementById('consumo').open = true;
  const initialTarget = revealTarget(window.location.hash);
  if (initialTarget) requestAnimationFrame(function () { initialTarget.scrollIntoView({ block: 'start' }); });
})();
