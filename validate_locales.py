import json, sys

errors = 0

# Validate en.json
with open('/tmp/solar-calculator/src/locales/en.json') as f:
    en = json.load(f)
print('en.json: valid')

# Validate ms.json
with open('/tmp/solar-calculator/src/locales/ms.json') as f:
    ms = json.load(f)
print('ms.json: valid')

# Check dashboard key parity
dash_en = set(en['dashboard'].keys())
dash_ms = set(ms['dashboard'].keys())
if dash_en != dash_ms:
    print(f'FAIL: dashboard keys differ')
    print(f'  Extra in en: {dash_en - dash_ms}')
    print(f'  Extra in ms: {dash_ms - dash_en}')
    errors += 1
else:
    print(f'dashboard: {len(dash_en)} keys match')

# Check settings key parity
sett_en = set(en['settings'].keys())
sett_ms = set(ms['settings'].keys())
if sett_en != sett_ms:
    print(f'FAIL: settings keys differ')
    print(f'  Extra in en: {sett_en - sett_ms}')
    print(f'  Extra in ms: {sett_ms - sett_en}')
    errors += 1
else:
    print(f'settings: {len(sett_en)} keys match')

# Check evCalc key parity (flat keys only)
ev_en = set(en['evCalc'].keys()) - {'presets'}
ev_ms = set(ms['evCalc'].keys()) - {'presets'}
if ev_en != ev_ms:
    print(f'FAIL: evCalc keys differ')
    print(f'  Extra in en: {ev_en - ev_ms}')
    print(f'  Extra in ms: {ev_ms - ev_en}')
    errors += 1
else:
    print(f'evCalc: {len(ev_en)} flat keys match')

# Check presets parity
pre_en = set(en['evCalc'].get('presets', {}).keys())
pre_ms = set(ms['evCalc'].get('presets', {}).keys())
if pre_en != pre_ms:
    print(f'FAIL: presets keys differ')
    errors += 1
else:
    print(f'evCalc presets: {len(pre_en)} keys match')

# Check ev-calculator page
with open('/tmp/solar-calculator/src/app/[locale]/ev-calculator/page.tsx') as f:
    content = f.read()

# Check that the page uses the correct key names
required_ev_keys = [
    'evCalc.title', 'evCalc.batteryCapacity', 'evCalc.batteryCapacityPlaceholder',
    'evCalc.currentCharge', 'evCalc.currentChargePlaceholder',
    'evCalc.targetCharge', 'evCalc.targetChargePlaceholder',
    'evCalc.rate', 'evCalc.ratePlaceholder', 'evCalc.rateName', 'evCalc.rateNamePlaceholder',
    'evCalc.quickPresets', 'evCalc.presets.20to80', 'evCalc.presets.30to80',
    'evCalc.presets.10to90', 'evCalc.presets.0to100',
    'evCalc.batteryVisual', 'evCalc.currentTitle', 'evCalc.afterChargingTitle',
    'evCalc.chargeAddedLegend', 'evCalc.existingLegend', 'evCalc.availableLegend',
    'evCalc.costBreakdown', 'evCalc.chargeAddedLabel', 'evCalc.energyNeeded', 'evCalc.estimatedCost',
    'evCalc.chargingSummaryPrefix', 'evCalc.chargingSummaryBattery', 'evCalc.chargingSummaryTo',
    'evCalc.chargingSummaryCharge', 'evCalc.chargingSummaryAt', 'evCalc.chargingSummaryCostsApprox'
]

# Check these keys are used in the page (simple substring check)
for key in required_ev_keys:
    if key not in content:
        print(f'FAIL: ev-calculator page missing t("{key}") call')
        errors += 1

if not any(b in content for b in ['Battery Capacity (kWh)', 'Current Charge (%)', 'Target Charge (%)', 
                                    'Rate (RM/kWh)', 'Rate Name:', 'Quick Presets', 'Battery Visual',
                                    'Cost Breakdown', 'Charge Added', 'Energy Needed', 'Estimated Cost']):
    print('ev-calculator page: no hardcoded strings')
else:
    print('FAIL: hardcoded strings found in ev-calculator page')
    errors += 1

if errors:
    print(f'\n{errors} validation error(s)')
    sys.exit(1)
else:
    print('\nAll validations passed!')
