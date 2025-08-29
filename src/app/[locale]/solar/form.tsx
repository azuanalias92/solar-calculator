"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/useTranslation";

interface SolarConfig {
  peakSunHours: number;
  panelWatts: number;
  systemEfficiency: number;
}

interface SolarFormProps {
  onConfigUpdate: (config: SolarConfig) => void;
  currentConfig: SolarConfig;
}

export default function SolarForm({ onConfigUpdate, currentConfig }: SolarFormProps) {
  const { t } = useTranslation();
  const [peakSunHours, setPeakSunHours] = useState<string>(currentConfig.peakSunHours.toString());
  const [panelWatts, setPanelWatts] = useState<string>(currentConfig.panelWatts.toString());
  const [systemEfficiency, setSystemEfficiency] = useState<string>(currentConfig.systemEfficiency.toString());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse form data
    const peakSunHoursValue = parseFloat(peakSunHours) || 0;
    const panelWattsValue = parseFloat(panelWatts) || 0;
    const systemEfficiencyValue = parseFloat(systemEfficiency) || 0;

    if (peakSunHoursValue > 0 && panelWattsValue > 0 && systemEfficiencyValue > 0 && systemEfficiencyValue <= 100) {
      const config: SolarConfig = {
        peakSunHours: peakSunHoursValue,
        panelWatts: panelWattsValue,
        systemEfficiency: systemEfficiencyValue,
      };

      // Update the configuration
      onConfigUpdate(config);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="peakSunHours">{t('solarForm.peakSunHours')}</Label>
        <Input id="peakSunHours" type="number" step="0.1" value={peakSunHours} onChange={(e) => setPeakSunHours(e.target.value)} placeholder={t('solarForm.peakSunHoursPlaceholder')} required />
      </div>
      <div>
        <Label htmlFor="panelWatts">{t('solarForm.panelWatts')}</Label>
        <Input id="panelWatts" type="number" value={panelWatts} onChange={(e) => setPanelWatts(e.target.value)} placeholder={t('solarForm.panelWattsPlaceholder')} required />
      </div>
      <div>
        <Label htmlFor="systemEfficiency">{t('solarForm.systemEfficiency')}</Label>
        <Input
          id="systemEfficiency"
          type="number"
          step="0.1"
          min="1"
          max="100"
          value={systemEfficiency}
          onChange={(e) => setSystemEfficiency(e.target.value)}
          placeholder={t('solarForm.systemEfficiencyPlaceholder')}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        {t('buttons.updateConfiguration')}
      </Button>
    </form>
  );
}
