from pathlib import Path
from urllib.parse import parse_qs, urlparse
import math
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('PACO_TEST_URL', (ROOT / 'index.html').as_uri())
BASE_URL = urlparse(URL)._replace(query='', fragment='').geturl()
SHOTS = ROOT / 'tests' / 'screenshots'
SHOTS.mkdir(exist_ok=True)

def amount(page, selector):
    return page.locator(selector).text_content().replace('\xa0', ' ').replace('.', '')

def text(page, selector):
    return page.locator(selector).text_content().replace('\xa0', ' ')

def set_range(page, selector, value):
    page.locator(selector).evaluate('(el, value) => { el.value = value; el.dispatchEvent(new Event("input", {bubbles:true})); }', str(value))

def price_number(value):
    return str(int(value)) if value == int(value) else f'{value:.2f}'.replace('.', ',')

def mail_body(page):
    return parse_qs(urlparse(page.locator('#proposal-contact').get_attribute('href')).query)['body'][0]

def assert_layout(page, width):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'overflow {width}'
    assert page.evaluate('''() => {
        const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
        return ids.length === new Set(ids).size;
    }'''), 'Duplicate IDs'
    assert page.evaluate('''() => [...document.querySelectorAll('a[href^="#"]')].every(a => document.getElementById(a.getAttribute('href').slice(1)))'''), 'Broken internal anchor'

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
            assert not requests and page.locator('script[data-widget-id]').count() == 0
            assert page.locator('.demo-shell').count() == 0
            assert page.locator('main > section').last.get_attribute('id') == 'propuesta'
            assert page.locator('.review-card').count() == 3
            assert page.locator('.care-grid article').count() == 6
            assert page.locator('.bonus-grid article').count() == 3
            assert '4,9' in text(page, '.rating-block')
            assert 'agenda, WhatsApp ni teléfono del centro' in text(page, '.demo-ribbon')
            assert page.locator('[name="service-plan"]').count() == 3
            assert page.locator('#extra-growth,#add-growth-capacity,#extra-whatsapp').count() == 0
            assert page.locator('#consumo').get_attribute('open') is None
            assert page.locator('#limited-consumption').is_hidden()
            assert amount(page, '#quote-monthly') == '297'
            assert amount(page, '#quote-estimated').startswith('313,20 '), (amount(page, '#quote-estimated'), errors)
            assert amount(page, '#quote-year-total') == '4561 €'
            assert 'Incluido' in text(page, '#quote-whatsapp-line')
            assert 'sin suplemento mensual' in text(page, '#whatsapp-included')
            assert 'minutos de red telefónica' in text(page, '.external-costs')
            assert '0,27' in text(page, '#plan-consumption-note')
            assert page.locator('#quote-unit-rates').is_visible()
            assert page.locator('#quote-unlimited').is_hidden()
            assert page.locator('#quote-estimated').is_hidden(), 'Simulation must be secondary, not in primary summary'
            assert page.locator('.monthly-total').get_attribute('aria-live') == 'polite'
            assert 'micrófono se usa solo en esta demostración' in text(page, '.voice-demo-panel')
            assert 'no la voz desde la web' in text(page, '.voice-demo-panel')
            assert 'llamadas entrantes' in text(page, '#quote-support')
            assert 'L–V 09:00–18:00 (hora peninsular)' in text(page, '#quote-support')
            assert 'incidencias técnicas críticas los 365 días' in text(page, '#quote-support')
            assert text(page, '.quote-tax') == 'Consumos externos aparte'
            assert text(page, '#commercial-tax-note') == 'Todos los precios son sin IVA.'
            assert page.locator('#fiscal-summary,#fiscal-terms').count() == 0
            assert 'Fiscalidad pendiente' not in text(page, '#propuesta')
            assert 'tratamiento fiscal' not in text(page, '#propuesta')
            assert 'inversión del sujeto pasivo' not in text(page, '#propuesta')
            assert '· base' not in text(page, '.plan-grid')
            tax_note = page.locator('#commercial-tax-note').bounding_box()
            quote = page.locator('.quote-summary').bounding_box()
            assert tax_note['y'] >= quote['y'] + quote['height'], 'VAT note must follow the proposal'
            assert 'No es atención de urgencias médicas' in text(page, '#support-terms')
            assert 'gestiona desde España' not in text(page, '#propuesta')
            assert_layout(page, width)
            if width in (390, 1440):
                page.locator('.plan-picker').screenshot(path=str(SHOTS / f'{width}-three-plans.png'))
                page.locator('#consumo').screenshot(path=str(SHOTS / f'{width}-conditions-closed.png'))
            page.locator('.external-costs a').click()
            assert page.locator('#consumo').get_attribute('open') is not None
            assert page.locator('#limited-consumption').is_visible()
            assert page.locator('.overage-card').count() == 2
            assert amount(page, '#voice-unit-price') == '0,27 €'
            assert amount(page, '#text-unit-price') == '0,30 €'
            assert page.locator('.voice-bundle-card').count() == 4
            for bundle, cost, rate in [('200', 50, '0,25'), ('500', 110, '0,22'), ('1000', 200, '0,20')]:
                assert amount(page, f'#bundle-{bundle}-price') == f'+{cost} €'
                assert amount(page, f'#bundle-{bundle}-rate') == f'{rate} €/min'
            scenarios = [(20, 50, 3), (60, 0, 3), (60, 100, 1), (60, 50, 3), (60, 100, 8), (5, 5, 1.5)]
            for plan, base, text_limit, voice_limit in [('initial', 197, 300, 100), ('complete', 297, 600, 600)]:
                page.locator(f'[name="service-plan"][value="{plan}"]').check()
                for bundle, minutes, cost in [('none', 0, 0), ('200', 200, 50), ('500', 500, 110), ('1000', 1000, 200)]:
                    page.locator(f'[name="voice-bundle"][value="{bundle}"]').check()
                    assert amount(page, '#quote-monthly') == str(base + cost)
                    assert amount(page, '#quote-year-total') == f'{997 + (base + cost) * 12} €'
                    assert page.locator('#quote-bundle-line').is_visible() == bool(minutes)
                    for daily, share, duration in scenarios:
                        set_range(page, '#daily-contacts', daily)
                        set_range(page, '#voice-share', share)
                        set_range(page, '#call-duration', duration)
                        total = daily * 22
                        expected_text = math.floor(total * (100 - share) / 100 + 0.5)
                        expected_minutes = math.ceil(total * share / 100 * duration)
                        excess_text = max(0, expected_text - text_limit)
                        excess_voice = max(0, expected_minutes - voice_limit - minutes)
                        excess = round(excess_text * 0.30 + excess_voice * 0.27, 2)
                        assert page.locator('#estimated-conversations').inner_text() == f'{expected_text:,}'.replace(',', '.')
                        assert page.locator('#estimated-minutes').inner_text() == f'{expected_minutes:,}'.replace(',', '.')
                        assert amount(page, '#quote-estimated').startswith(price_number(round(base + cost + excess, 2)) + ' '), (width, bundle, daily, share, duration)
                        assert page.locator('#quote-overage-detail').is_visible() == bool(excess)
                        assert f'{voice_limit + minutes:,}'.replace(',', '.') + ' minutos IA/mes' in text(page, '#usage-fit')
                    body = mail_body(page)
                    assert f'Cuota: {base + cost}' in body
                    assert f'IA: {text_limit:,}'.replace(',', '.') + ' conversaciones' in body
                    assert 'Voz por llamadas telefónicas entrantes; el micrófono es solo para la demo' in body
                    assert 'L–V 09:00–18:00, hora peninsular; incidencias técnicas críticas los 365 días' in body
                    assert body.endswith('Todos los precios son sin IVA.')
                    assert 'Fiscalidad pendiente' not in body
                    assert '+ IVA' not in body
                    assert f'bundle={bundle}' in body and 'growth=' not in body and 'wa=' not in body
                    printable = text(page, '#print-proposal-document')
                    assert 'Consumos y condiciones: Recepción IA' in printable
                    assert f'{text_limit:,}'.replace(',', '.') + ' conversaciones de texto' in printable
                    assert f'{voice_limit + minutes:,}'.replace(',', '.') + ' minutos IA de llamadas al mes' in printable
                    assert 'micrófono de esta demo no forma parte de la web final' in printable
                    assert 'de 09:00 a 18:00, hora peninsular' in printable
                    assert 'incidencias técnicas críticas los 365 días' in printable
                    assert printable.count('Todos los precios son sin IVA.') == 1
                    assert printable.endswith('Todos los precios son sin IVA.')
                    assert 'tratamiento fiscal' not in printable
                    assert 'importe base' not in printable
                    assert '+ IVA' not in printable
                    assert 'Voz web y teléfono comparten' not in printable
                    assert 'Voz IA: 0,27 €/min · Texto IA: 0,30 €/conversación' in printable
                    assert '1.000 min por 200 €/mes (0,20 €/min)' in printable
                    assert 'Crecimiento 67' not in printable
                    assert ('+ bono de voz' in printable) == bool(minutes)
                if plan == 'initial':
                    page.locator('[name="voice-bundle"][value="none"]').check()
                    set_range(page, '#daily-contacts', 20)
                    set_range(page, '#voice-share', 50)
                    set_range(page, '#call-duration', 3)
                    assert amount(page, '#quote-monthly') == '197'
                    assert amount(page, '#quote-year-total') == '3361 €'
                    assert amount(page, '#quote-estimated').startswith('348,20 ')
                    assert '30 min de ajustes/mes. Sin revisión mensual' in text(page, '#quote-support')
                    assert 'cupo de 300' in text(page, '#usage-counting-terms')
                    assert '100 minutos IA de llamadas telefónicas entrantes' in text(page, '#usage-counting-terms')
                    if width in (390, 1440):
                        page.locator('.quote-summary').screenshot(path=str(SHOTS / f'{width}-initial-quote.png'))
                        page.emulate_media(media='print')
                        page.locator('#print-proposal-document').screenshot(path=str(SHOTS / f'{width}-initial-print.png'))
                        page.emulate_media(media='screen')
            page.locator('[name="service-plan"][value="elite"]').check()
            assert amount(page, '#quote-monthly') == '597'
            assert amount(page, '#quote-year-total') == '8161 €'
            assert page.locator('[name="voice-bundle"][value="none"]').is_checked()
            assert page.locator('[name="voice-bundle"][value="1000"]').is_disabled()
            assert page.locator('#limited-consumption').is_hidden()
            assert page.locator('#unlimited-terms').is_visible()
            assert page.locator('#quote-unit-rates').is_hidden()
            assert page.locator('#quote-unlimited').is_visible()
            assert page.locator('#quote-growth-line').is_visible()
            assert 'Incluidos' in text(page, '#quote-growth-line') and '67' not in text(page, '#quote-growth-line')
            assert page.locator('#quote-bundle-line').is_hidden()
            for daily, share, duration in scenarios:
                set_range(page, '#daily-contacts', daily)
                set_range(page, '#voice-share', share)
                set_range(page, '#call-duration', duration)
                assert amount(page, '#quote-estimated').startswith('597 ')
                assert amount(page, '#quote-monthly') == '597'
                assert page.locator('#quote-overage-detail').is_hidden()
                assert 'uso razonable' in text(page, '#usage-fit')
            printable = text(page, '#print-proposal-document')
            assert 'Crecimiento incluido en los 597' in printable
            assert '0,27' not in printable and '0,30' not in printable
            assert 'Bonos mensuales opcionales' not in printable
            assert 'bajo uso razonable' in mail_body(page)
            assert 'growth=' not in mail_body(page) and 'bundle=' not in mail_body(page)
            assert 'Cuota: 597' in mail_body(page)
            if width in (390, 1440):
                page.locator('.plan-picker').screenshot(path=str(SHOTS / f'{width}-elite-selected.png'))
                page.locator('.quote-summary').screenshot(path=str(SHOTS / f'{width}-elite-quote.png'))
                page.locator('#unlimited-terms').screenshot(path=str(SHOTS / f'{width}-fair-use.png'))
                page.emulate_media(media='print')
                assert page.locator('#print-proposal-document').is_visible()
                assert page.locator('#inicio').is_hidden()
                page.locator('#print-proposal-document').screenshot(path=str(SHOTS / f'{width}-elite-print.png'))
                page.emulate_media(media='screen')
            page.locator('[name="service-plan"][value="complete"]').check()
            assert amount(page, '#quote-monthly') == '297', 'Returning to basic must not restore a stale bundle charge'
            assert page.locator('[name="voice-bundle"][value="none"]').is_checked()
            assert page.locator('[name="voice-bundle"][value="1000"]').is_enabled()
            assert page.locator('#quote-unit-rates').is_visible()
            assert page.locator('#quote-growth-line').is_hidden()
            set_range(page, '#daily-contacts', 20)
            set_range(page, '#voice-share', 50)
            set_range(page, '#call-duration', 3)
            assert '60 min extra × 0,27 € = 16,20 €' in text(page, '#quote-overage-detail')
            assert page.locator('.meta-rate-table tbody tr').count() == 4
            assert '0,0585' in text(page, '.meta-rate-table')
            assert '0,0166' in text(page, '.meta-rate-table')
            assert '1.000' in text(page, '.meta-policy')
            assert 'utilidad se factura también dentro de las 24 h' in text(page, '.meta-policy')
            assert '5 %' in text(page, '.meta-billing') and '0,0707 USD' in text(page, '.meta-billing')
            assert '3,32 €' in text(page, '.meta-examples') and '8,30 €' in text(page, '.meta-examples')
            printable = text(page, '#print-proposal-document')
            assert 'WhatsApp incluido: mensajes y plantillas' in printable
            assert 'Privacidad, seguridad y control' in printable
            assert 'canal WhatsApp incluido (un número, sin suplemento fijo)' in printable
            assert page.locator('.print-meta-table tbody tr').count() == 4
            assert '0,0166 €' in printable and '0,0585 €' in printable and '5 %' in printable
            for selector in ('.setup-scope', '.care-details details', '.sales-faq details', '.faq-section .faq-list details', '.meta-templates'):
                item = page.locator(selector).first
                item.locator('summary').click()
                assert item.get_attribute('open') is not None
            assert_layout(page, width)
            assert 'NaN' not in text(page, '#propuesta') and 'undefined' not in text(page, '#propuesta')
            if width in (390, 1440):
                for name, selector in [('offer', '.offer-value'), ('quote', '.quote-summary'), ('bundles', '#bonos-voz'), ('whatsapp', '#whatsapp-costes'), ('included-channel', '#whatsapp-included'), ('vat-note', '#commercial-tax-note')]:
                    page.locator(selector).screenshot(path=str(SHOTS / f'{width}-{name}.png'))
                page.emulate_media(media='print')
                page.locator('#print-proposal-document').screenshot(path=str(SHOTS / f'{width}-basic-print.png'))
                page.emulate_media(media='screen')
            page.evaluate('''() => Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async value => {window.__copiedURL=value;}}})''')
            page.locator('#copy-proposal-link').click()
            page.wait_for_function('Boolean(window.__copiedURL)')
            copied = parse_qs(urlparse(page.evaluate('window.__copiedURL')).query)
            assert copied['plan'] == ['complete'] and copied['bundle'] == ['none']
            assert 'growth' not in copied and 'wa' not in copied
            page.locator('[name="service-plan"][value="elite"]').check()
            page.locator('#copy-proposal-link').click()
            page.wait_for_function('window.__copiedURL.includes("plan=elite")')
            copied = parse_qs(urlparse(page.evaluate('window.__copiedURL')).query)
            assert 'bundle' not in copied and 'growth' not in copied and 'wa' not in copied
            page.evaluate('''() => Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText:async () => {throw new Error('blocked')}}})''')
            page.locator('#copy-proposal-link').click()
            page.wait_for_selector('#proposal-feedback input')
            assert 'plan=elite' in page.locator('#proposal-feedback input').input_value()
            page.evaluate('window.print = () => {window.__printCalled = true;}')
            page.locator('#print-proposal').click()
            assert page.evaluate('window.__printCalled')
            assert '597 €/mes' in text(page, '#print-proposal-document')
            assert text(page, '#print-proposal-document').endswith('Todos los precios son sin IVA.')
            page.locator('#consumo > summary').click()
            assert page.locator('#consumo').get_attribute('open') is None
            page.locator('.quote-meta-note a').click()
            assert page.locator('#consumo').get_attribute('open') is not None
            assert page.locator('#whatsapp-costes').is_visible()
            assert page.locator('#activate-demo').is_disabled()
            assert page.locator('#confirm-demo').is_disabled()
            assert page.locator('#stop-demo').is_hidden()
            assert page.locator('.live-demo-panel').is_hidden()
            assert page.locator('.voice-demo-panel').is_hidden()
            page.locator('[data-open-privacy]').click()
            assert page.locator('#confirm-demo').is_hidden()
            page.keyboard.press('Escape')
            assert not requests and page.locator('script[data-widget-id]').count() == 0
            assert not errors, (width, errors)
            context.close()
            print(f'OK {width}px: 48 limited-plan scenarios + 6 unlimited scenarios, print/mail/links/privacy/layout.', flush=True)

        context = browser.new_context(reduced_motion='reduce')
        context.route('https://widgets.leadconnectorhq.com/**', lambda route: route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for query, monthly, notice in [
            ('plan=digital&wa=0&growth=1&bundle=500&daily=10&voice=25&duration=2', '197', True),
            ('plan=essential&wa=0&bundle=1000', '297', True),
            ('plan=initial&wa=0', '197', False),
            ('plan=initial&bundle=500', '307', False),
            ('plan=initial&bundle=1000', '397', False),
            ('plan=complete&wa=1', '297', False),
            ('plan=complete&growth=1&bundle=200', '347', True),
            ('plan=elite&wa=1&growth=1&bundle=1000', '597', True),
            ('plan=elite&bundle=500', '597', False),
            ('plan=__proto__&bundle=__proto__&daily=999&voice=-20&duration=NaN', '297', True),
        ]:
            page.goto(BASE_URL + '?' + query, wait_until='networkidle')
            assert amount(page, '#quote-monthly') == monthly, query
            assert page.locator('#legacy-selection').is_visible() == notice, query
            assert 'Incluido' in text(page, '#quote-whatsapp-line')
            if query.startswith('plan=elite'):
                assert page.locator('[name="voice-bundle"][value="none"]').is_checked()
                assert 'bundle=' not in mail_body(page)
                assert '0,27' not in text(page, '#print-proposal-document')
            if '__proto__' in query:
                assert page.locator('#daily-contacts').input_value() == '60'
                assert page.locator('#voice-share').input_value() == '0'
                assert page.locator('#call-duration').input_value() == '3'
        page.goto(BASE_URL + '?plan=elite#whatsapp-costes', wait_until='networkidle')
        assert page.locator('#consumo').get_attribute('open') is not None
        assert page.locator('#whatsapp-costes').is_visible()
        page.goto(BASE_URL + '?plan=elite#bonos-voz', wait_until='networkidle')
        assert page.locator('#consumo').get_attribute('open') is not None
        assert page.locator('#unlimited-terms').is_visible()
        page.goto(BASE_URL + '?plan=complete&bundle=500#propuesta', wait_until='networkidle')
        assert amount(page, '#quote-monthly') == '407'
        assert page.locator('#consumo').get_attribute('open') is not None
        assert '1.100 minutos' in text(page, '#print-proposal-document')
        assert 'bono de voz 500 min: 110 €/mes' in text(page, '#print-proposal-document')
        page.goto(BASE_URL + '?plan=initial&bundle=200#propuesta', wait_until='networkidle')
        assert amount(page, '#quote-monthly') == '247'
        assert '300 conversaciones de texto y 300 minutos IA de llamadas' in text(page, '#print-proposal-document')
        page.goto(BASE_URL + '#%', wait_until='networkidle')
        assert not errors
        context.close()
        browser.close()

if __name__ == '__main__':
    run()
    print('OK: three plans 197/297/597 + setup997, 5 viewports, 270 use scenarios, print/mail/share, legacy/invalid links. Former demo widgets removed: zero provider requests and disabled activation. No real conversations or subscriptions.')
