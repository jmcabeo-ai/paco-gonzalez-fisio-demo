# Demo — Centro de Fisioterapia y Entrenamiento Paco González

Demostración visual e interactiva para presentar una posible web y el recorrido de una futura secretaría con IA. No es una web final ni un asistente conectado al centro.

## Probar localmente

Abre `index.html` en un navegador. La experiencia funciona sin servidor ni cuenta. Para la comprobación automatizada, ejecuta `python tests/smoke.py` si Playwright está instalado.

## Límites de seguridad de la demo

- Agenda creada en memoria dentro del navegador. Al recargar, se borran todas las citas de prueba.
- Fechas y horas inventadas. No se consulta ni modifica la disponibilidad real.
- La vista de WhatsApp no envía mensajes. La vista de llamada no marca números. La voz, si se activa, utiliza solo la síntesis local del navegador.
- No se solicitan datos personales ni de salud.
- La foto de portada es una imagen conceptual generada para este prototipo; no representa a Paco, su equipo ni sus instalaciones.
- Los servicios, dirección, teléfono e Instagram se basan en el briefing facilitado. Horarios, precios, personal, software actual e integración permanecen pendientes de confirmar.

## Para pasar de demo a proyecto

Confirmar con el centro su agenda/software, tipos y duración de citas, disponibilidad, reglas de cancelación, números/canales autorizados, textos de consentimiento y recordatorios, información pública definitiva e identidad gráfica/fotografía propia.
