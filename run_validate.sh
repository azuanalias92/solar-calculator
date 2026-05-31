#!/bin/bash
python3 -c '
import json

with open("/tmp/solar-calculator/src/locales/en.json") as f:
    en = json.load(f)
print("en.json: OK valid")

with open("/tmp/solar-calculator/src/locales/ms.json") as f:
    ms = json.load(f)
print("ms.json: OK valid")

dash_en = set(en["dashboard"].keys())
dash_ms = set(ms["dashboard"].keys())
assert dash_en == dash_ms, "dashboard key mismatch!"
print("dashboard keys: %d OK match" % len(dash_en))

sett_en = set(en["settings"].keys())
sett_ms = set(ms["settings"].keys())
assert sett_en == sett_ms, "settings key mismatch!"
print("settings keys: %d OK match" % len(sett_en))

ev_en = set(en["evCalc"].keys()) - {"presets"}
ev_ms = set(ms["evCalc"].keys()) - {"presets"}
assert ev_en == ev_ms, "evCalc key mismatch!"
print("evCalc keys: %d OK match" % len(ev_en))

pre_en = set(en["evCalc"].get("presets", {}).keys())
pre_ms = set(ms["evCalc"].get("presets", {}).keys())
assert pre_en == pre_ms, "presets key mismatch!"
print("evCalc presets: %d OK match" % len(pre_en))

with open("/tmp/solar-calculator/src/app/[locale]/ev-calculator/page.tsx") as f:
    content = f.read()

bad = ["Battery Capacity (kWh)", "Current Charge (%)", "Target Charge (%)", "Rate (RM/kWh)", "Rate Name:", "Quick Presets", "Battery Visual", "Cost Breakdown", "Charge Added", "Energy Needed", "Estimated Cost"]
for b in bad:
    if b in content:
        print("FAIL: string found in page: " + b)
        exit(1)
print("ev-calculator page: OK no hardcoded strings")

print()
print("All validations passed!")
'
