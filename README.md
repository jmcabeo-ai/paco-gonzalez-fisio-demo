# Demo — Centro de Fisioterapia y Entrenamiento Paco González

Landing conceptual del centro y presentación comercial OMNIA. Incluye servicios, equipo, entrenamiento, reseñas públicas, contacto, asistentes reales en un entorno ficticio, posibles automatizaciones, implantación, privacidad y propuesta interactiva al final.

## Probar

Abrir `index.html` permite usar el configurador sin servidor. Para probar los servicios externos de chat y voz, usar la URL pública con conexión a Internet. El usuario los activa expresamente tras leer la información de la demo; antes no se cargan sus scripts. La voz conserva el perfil aceptado por Jonathan.

`python tests/smoke.py` comprueba con Chrome: cinco tamaños de pantalla, errores JS, precios y escenarios, enlaces compartibles, impresión, acordeones y carga diferida de los códigos de widget. Los scripts externos se sustituyen en esa prueba por respuestas vacías; **no verifica por sí sola las respuestas del agente**. Las pruebas reales de conversación se documentan internamente en `PROGRESS.md` y `CONFIG_GHL_DEMO.md`.

## Límites

- Un único calendario de demostración aislado en OMNIA, solo fisioterapia. Sin Google Calendar, WhatsApp, teléfono o pacientes reales del centro.
- El chat y la voz pueden guardar conversaciones y reservas ficticias en la subcuenta. Usar solo datos inventados, nunca datos de salud. Desactivar/recargar retira los widgets, pero no borra lo enviado.
- Se ha retirado el simulador local que duplicaba las pruebas. Las cancelaciones, cambios, recordatorios, transferencias y canales de producción son **alcance propuesto**, no acciones verificadas de esta demo.
- La IA administrativa no debe diagnosticar, dar pautas médicas ni recoger historias clínicas. Una cita puede revelar información de salud: no se conecta producción sin revisar base jurídica, proveedores y garantías.
- Los precios y cupos son una propuesta comercial OMNIA, no una suscripción activa ni límites nativos garantizados del proveedor. El control y la medición se validan antes del arranque.
- Las tarifas fuera del cupo están visibles sin desplegables en `#consumo`, en el resumen y al imprimir: 0,35 €/minuto IA y 0,30 €/conversación de texto, solo con autorización. La ampliación Crecimiento de 67 €/mes añade 400 minutos y 400 conversaciones en planes IA, además de sus circuitos/revisión; es el mismo extra del configurador, no un segundo cargo ni un bono de pago único. Impuestos y consumos de canales aparte.
- La comparación económica son tarifas propuestas por trabajo, no un precio anterior ficticio. Si se elige Esencial se retira la valoración del agente. No hay contratación ni pago online.
- La propuesta puede imprimirse/guardarse como PDF desde el navegador y compartirse por URL sin datos personales. El contacto comercial abre el correo del usuario; no envía mensajes automáticamente.
- Las imágenes son conceptuales y no representan al centro, instalaciones o equipo. La valoración 4,9/5 con 30 reseñas se consultó en [Google Maps](https://www.google.com/maps?cid=7383613060296208757) el 1 de octubre de 2026. Los extractos conservan atribución y enlace al original.

## Antes de producción

Confirmar identidad jurídica del centro y de OMNIA, DPD/asesoría, reparto de las cinco agendas, duración y reglas de cita, canales/números autorizados, atención humana y excepciones, textos y recursos definitivos. Documentar contrato de encargo y subencargados, bases jurídicas, admisibilidad de datos sanitarios, transferencias, riesgos/EIPD cuando proceda, derechos, conservación, grabación, cookies y recuperación. Validar límites reales y costes antes de contratar.

La sección de privacidad describe el **trabajo previsto**; no constituye una certificación ni la política legal definitiva del centro. DPD, auditoría jurídica, evaluación de impacto externa, SLA 24/7, copia independiente de todo el CRM e integraciones especiales no se presuponen incluidos.
