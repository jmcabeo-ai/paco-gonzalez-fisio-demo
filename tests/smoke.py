from pathlib import Path
from urllib.parse import parse_qs, urlparse
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('PACO_TEST_URL', (ROOT / 'index.html').as_uri())
SHOTS = ROOT / 'tests' / 'screenshots'
SHOTS.mkdir(exist_ok=True)

def amount(page, selector):
    return page.locator(selector).inner_text().replace('\xa0', ' ').replace('.', '')

def set_range(page, selector, value):
    page.locator(selector).evaluate('(el, value) => { el.value = value; el.dispatchEvent(new Event("input", {bubbles:true})); }', str(value))

def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
        for width in (375, 390, 768, 1024, 1440):
            context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
            requests = []
            def fake_widget(route):
                requests.append(route.request.url)
                route.fulfill(status=200, content_type='application/javascript', body='/* external service mocked for UI tests */')
            context.route('https://widgets.leadconnectorhq.com/**', fake_widget)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(URL, wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            assert not requests, 'Widgets must not load before activation'
            assert page.locator('script[data-widget-id]').count() == 0
            assert page.locator('.demo-shell').count() == 0
            assert page.locator('main > section').last.get_attribute('id') == 'propuesta'
            assert page.locator('.review-card').count() == 3
            assert page.locator('.care-grid article').count() == 6
            assert page.locator('.bonus-grid article').count() == 3
            assert '4,9' in page.locator('.rating-block').inner_text()
            assert 'agenda, WhatsApp ni teléfono del centro' in page.locator('.demo-ribbon').inner_text()
            assert amount(page, '#quote-monthly') == '326'
            assert amount(page, '#quote-estimated').startswith('347 ')
            assert amount(page, '#quote-year-total') == '4909 €'
            assert page.locator('#estimated-conversations').inner_text() == '220'
            assert page.locator('#estimated-minutes').inner_text() == '660'
            assert page.locator('#consumo').is_visible()
            assert page.locator('.overage-card').count() == 3
            assert amount(page, '#voice-unit-price') == '0,35 €'
            assert amount(page, '#text-unit-price') == '0,30 €'
            assert amount(page, '#growth-unit-price') == '+67 €'
            assert page.locator('.usage-terms').get_attribute('open') is None
            assert '60 min extra × 0,35 € = 21 €' in page.locator('#quote-overage-detail').inner_text().replace('\xa0', ' ')
            assert '0,35' in page.locator('#quote-rates').inner_text()
            for key, base in [('essential', 97), ('digital', 197), ('complete', 297)]:
                page.locator(f'[name="service-plan"][value="{key}"]').check()
                for wa in (False, True):
                    page.locator('#extra-whatsapp').set_checked(wa)
                    for growth in (False, True):
                        page.locator('#extra-growth').set_checked(growth)
                        expected = base + (29 if wa else 0) + (67 if growth else 0)
                        assert amount(page, '#quote-monthly') == str(expected), (width, key, wa, growth)
                        assert amount(page, '#quote-year-total') == f'{997 + expected * 12} €'
                        assert page.locator('#add-growth-capacity').get_attribute('aria-pressed') == str(growth).lower()
                if key == 'essential':
                    assert page.locator('#value-agent-line').is_hidden()
                    assert amount(page, '#standalone-total') == '1370 €'
                    assert amount(page, '#bundle-saving').startswith('373 €')
                    assert 'atención humana' in page.locator('#usage-fit').inner_text()
                    assert page.locator('#quote-unit-rates').is_hidden()
                    assert page.locator('#quote-overage-detail').is_hidden()
                    assert page.locator('#add-growth-capacity').is_hidden()
                    assert 'no activa agentes ni cupos IA' in page.locator('#growth-capacity').inner_text()
                else:
                    assert page.locator('#value-agent-line').is_visible()
                    assert amount(page, '#standalone-total') == '2060 €'
                    assert amount(page, '#bundle-saving').startswith('1063 €')
                    assert page.locator('#quote-unit-rates').is_visible()
                    assert page.locator('#add-growth-capacity').is_visible()
                    assert '+400 minutos IA y +400 conversaciones' in page.locator('#growth-capacity').inner_text()
            page.locator('#extra-whatsapp').uncheck()
            page.locator('#extra-growth').uncheck()
            set_range(page, '#daily-contacts', 60)
            set_range(page, '#voice-share', 0)
            assert amount(page, '#quote-estimated').startswith('513 ')
            assert '720 conversaciones extra × 0,30 € = 216 €' in page.locator('#quote-overage-detail').inner_text().replace('\xa0', ' ')
            set_range(page, '#voice-share', 100)
            set_range(page, '#call-duration', 1)
            assert amount(page, '#quote-estimated').startswith('549 ')
            assert '720 min extra × 0,35 € = 252 €' in page.locator('#quote-overage-detail').inner_text().replace('\xa0', ' ')
            set_range(page, '#voice-share', 50)
            set_range(page, '#call-duration', 3)
            assert amount(page, '#quote-estimated').startswith('798 ')
            assert '1.380 min extra × 0,35 € = 483 €' in page.locator('#quote-overage-detail').inner_text().replace('\xa0', ' ')
            assert '60 conversaciones extra × 0,30 € = 18 €' in page.locator('#quote-overage-detail').inner_text().replace('\xa0', ' ')
            set_range(page, '#daily-contacts', 20)
            set_range(page, '#voice-share', 50)
            set_range(page, '#call-duration', 3)
            page.locator('#extra-whatsapp').check()
            page.locator('#add-growth-capacity').click()
            assert page.locator('#extra-growth').is_checked()
            assert amount(page, '#quote-monthly') == '393'
            assert amount(page, '#quote-estimated').startswith('393 ')
            assert page.locator('#quote-overage-detail').is_hidden()
            assert '1.000 conversaciones y 1.000 minutos' in page.locator('#usage-fit').inner_text()
            page.locator('#add-growth-capacity').click()
            assert not page.locator('#extra-growth').is_checked()
            body = parse_qs(urlparse(page.locator('#proposal-contact').get_attribute('href')).query)['body'][0]
            assert '326' in body and 'plan=complete' in body and 'wa=1' in body
            page.locator('#copy-proposal-link').click()
            page.wait_for_function('document.getElementById("proposal-feedback").textContent.trim().length > 0')
            assert page.locator('#proposal-feedback').inner_text()
            for selector in ('.setup-scope', '.care-details details', '.sales-faq details', '.faq-section .faq-list details'):
                item = page.locator(selector).first
                item.locator('summary').click()
                assert item.get_attribute('open') is not None
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'overflow {width}'
            assert page.evaluate('''() => {
                const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
                return ids.length === new Set(ids).size;
            }''')
            assert page.evaluate('''() => [...document.querySelectorAll('a[href^="#"]')].every(a => document.getElementById(a.getAttribute('href').slice(1)))''')
            if width in (390, 1440):
                for name, selector in [('hero', '#inicio'), ('reviews', '#resenas'), ('protection', '#proteccion'), ('offer', '.offer-value'), ('plans', '.plan-picker'), ('consumption', '#consumo'), ('quote', '.quote-summary')]:
                    page.locator(selector).screenshot(path=str(SHOTS / f'{width}-{name}.png'))
                page.emulate_media(media='print')
                assert page.locator('#print-proposal-document').is_visible()
                assert page.locator('#inicio').is_hidden()
                assert 'Privacidad, seguridad y control' in page.locator('#print-proposal-document').inner_text()
                printable = page.locator('#print-proposal-document').inner_text().replace('\xa0', ' ')
                assert 'Tarifas fuera del cupo y ampliación mensual' in printable
                assert 'Voz IA: 0,35 €/min · Texto IA: 0,30 €/conversación' in printable
                assert '60 min extra × 0,35 € = 21 €' in printable
                assert 'Ampliación Crecimiento: +67 €/mes (opcional' in printable
                page.locator('#print-proposal-document').screenshot(path=str(SHOTS / f'{width}-print.png'))
                page.emulate_media(media='screen')
            page.locator('#activate-demo').click()
            assert page.locator('#demo-privacy').is_visible()
            assert not requests
            page.keyboard.press('Escape')
            assert page.locator('#demo-privacy').is_hidden()
            page.locator('#activate-demo').click()
            page.locator('#confirm-demo').click()
            page.wait_for_function('document.querySelectorAll("script[data-widget-id]").length === 2')
            assert requests
            assert page.locator('script[data-widget-id="6abe41a6cdeb03a6d5b9b175"]').count() == 1
            assert page.locator('script[data-widget-id="6abe4375b9739b959273ef08"]').count() == 1
            assert page.locator('#stop-demo').is_visible()
            page.locator('[data-open-privacy]').click()
            assert page.locator('#confirm-demo').is_hidden()
            page.keyboard.press('Escape')
            assert not errors, (width, errors)
            context.close()
        page = browser.new_page(reduced_motion='reduce')
        page.goto(URL.split('?')[0] + '?plan=digital&wa=0&growth=1&daily=10&voice=25&duration=2')
        assert amount(page, '#quote-monthly') == '264'
        assert page.locator('#estimated-conversations').inner_text() == '165'
        assert page.locator('#estimated-minutes').inner_text() == '110'
        assert amount(page, '#quote-estimated').startswith('264 ')
        page.goto(URL.split('?')[0] + '?plan=__proto__&daily=999&voice=-20&duration=NaN')
        assert page.locator('[name="service-plan"][value="complete"]').is_checked()
        assert page.locator('#daily-contacts').input_value() == '60'
        assert page.locator('#voice-share').input_value() == '0'
        assert page.locator('#call-duration').input_value() == '3'
        browser.close()

if __name__ == '__main__':
    run()
    print('OK: 5 viewports, 12 combinations, visible overage rates/breakdowns, monthly capacity toggle, usage scenarios, privacy gate, print, URLs, no JS errors/overflow. External widgets mocked.')
