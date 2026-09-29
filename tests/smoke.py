from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT / 'index.html').as_uri()
SHOTS = ROOT / 'tests' / 'screenshots'
SHOTS.mkdir(exist_ok=True)


def run() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        )
        for name, width, height in [('desktop', 1440, 900), ('mobile', 390, 844)]:
            page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(URL)
            page.screenshot(path=str(SHOTS / f'{name}-hero.png'), full_page=True)
            assert page.locator('h1').is_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{name}: horizontal overflow'
            page.locator('#demo').scroll_into_view_if_needed()
            page.get_by_role('button', name='Buscar cita de ejemplo').click()
            assert 'solo citas de fisioterapia' in page.locator('#messages').inner_text()
            assert page.get_by_role('button', name='Entrenamiento personal').count() == 0
            page.locator('.quick-actions button').first.click()
            page.get_by_role('button', name='09:30').click()
            page.get_by_role('button', name='Confirmar cita de prueba').click()
            assert 'PG-DEMO-001' in page.locator('#messages').inner_text()
            assert page.locator('#booking-count').inner_text() == '01'
            page.get_by_role('button', name='Ver recordatorio simulado').click()
            assert 'no se programa ni se envía' in page.locator('#messages').inner_text()
            page.get_by_role('button', name='LLAMADA').click()
            assert page.locator('#call-display').is_visible()
            page.get_by_role('button', name='Anular esta cita').click()
            page.get_by_role('button', name='Sí, anular cita de prueba').click()
            assert page.locator('#booking-count').inner_text() == '00'
            assert 'CITA DE DEMOSTRACIÓN ANULADA' in page.locator('#messages').inner_text()
            for typed in ['quiero una cita', '1', '12:00', 'sí']:
                page.locator('#demo-input').fill(typed)
                page.get_by_role('button', name='Enviar mensaje de prueba').click()
            assert page.locator('#booking-count').inner_text() == '01'
            assert 'PG-DEMO-002' in page.locator('#messages').inner_text()
            page.screenshot(path=str(SHOTS / f'{name}-demo.png'), full_page=True)
            assert not errors, f'{name}: JavaScript errors: {errors}'
            page.close()
        for width in (375, 768, 1024):
            page = browser.new_page(viewport={'width': width, 'height': 850})
            page.goto(URL)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), f'{width}: horizontal overflow'
            page.locator('.faq-list details').first.locator('summary').click()
            assert page.locator('.faq-list details').first.get_attribute('open') is not None
            page.close()
        browser.close()


if __name__ == '__main__':
    run()
    print('Smoke test desktop/mobile: reserva, recordatorio, cambio de canal y cancelación OK')
