# Demo — Centro de Fisioterapia y Entrenamiento Paco González

Demostración visual e interactiva de una posible web y una recepción virtual de prueba. El chat flotante y el módulo de voz integrado usan una subcuenta y un calendario ficticios de OMNIA; no están conectados al centro.

## Probar localmente

Abre `index.html` en un navegador para usar el recorrido guiado sin servidor. El widget de IA requiere conexión a Internet y se comprueba mejor desde la URL pública. Para la comprobación automatizada del recorrido guiado, ejecuta `python tests/smoke.py` si Playwright está instalado.

## Límites de seguridad de la demo

- El recorrido guiado usa una agenda en memoria dentro del navegador. Al recargar, se borran sus citas simuladas.
- El chat y el módulo de voz reales usan un calendario distinto, aislado en GHL, con huecos ficticios. Sus mensajes y reservas de prueba sí se guardan en la subcuenta de OMNIA; usar datos inventados.
- Fechas y horas inventadas. No se consulta ni modifica la disponibilidad real.
- El simulador de reservas está limitado a fisioterapia. Los servicios de entrenamiento aparecen en la web, pero no en su agenda de prueba.
- La vista de WhatsApp no envía mensajes. La vista de llamada no marca números. La voz, si se activa, utiliza solo la síntesis local del navegador.
- No se deben proporcionar datos médicos ni de pacientes. El widget puede solicitar un dato de contacto ficticio para completar una reserva de prueba.
- Las imágenes de portada, fondos y tarjetas son conceptuales y generadas para este prototipo; no representan a Paco, su equipo ni sus instalaciones.
- Los servicios, dirección, teléfono e Instagram se basan en el briefing facilitado. Paco confirmó después que utilizan Google Calendar y cuentan con cinco fisioterapeutas; la estructura de sus calendarios individuales sigue pendiente. Horarios, precios, nombres del equipo e integración permanecen sin confirmar.

## Para pasar de demo a proyecto

Confirmar con el centro su agenda/software, tipos y duración de citas, disponibilidad, reglas de cancelación, números/canales autorizados, textos de consentimiento y recordatorios, información pública definitiva e identidad gráfica/fotografía propia.
