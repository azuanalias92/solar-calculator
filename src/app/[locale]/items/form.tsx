"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/useTranslation";

interface Item {
  name: string;
  watt: number;
  quantity: number;
  hoursUsage: number;
  estimatekWh: number;
}

interface ItemFormProps {
  onAddItem: (item: Item) => void;
}

export default function ItemForm({ onAddItem }: ItemFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState<string>("");
  const [watt, setWatt] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [hoursUsage, setHoursUsage] = useState<string>("");
  const [estimatekWh, setEstimateKwh] = useState<string>("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse form data
    const wattValue = parseFloat(watt) || 0;
    const quantityValue = parseInt(quantity) || 0;
    const hoursUsageValue = parseFloat(hoursUsage) || 0;
    const estimateKwhValue = (parseFloat(watt) / 1000) * parseFloat(hoursUsage) * parseFloat(quantity) || 0;

    if (name.trim() && wattValue > 0 && estimateKwhValue > 0 && quantityValue > 0 && hoursUsageValue > 0) {
      const item: Item = {
        name: name.trim(),
        watt: wattValue,
        quantity: quantityValue,
        hoursUsage: hoursUsageValue,
        estimatekWh: estimateKwhValue,
      };

      // Add the item
      onAddItem(item);

      // Reset form
      setName("");
      setWatt("");
      setQuantity("");
      setHoursUsage("");
      setEstimateKwh("");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">{t('form.itemName')}</Label>
        <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('form.itemNamePlaceholder')} required />
      </div>
      <div>
        <Label htmlFor="watt">{t('form.wattPerItem')}</Label>
        <Input id="watt" type="number" step="0.01" value={watt} onChange={(e) => setWatt(e.target.value)} placeholder={t('form.wattPlaceholder')} required />
      </div>
      <div>
        <Label htmlFor="hoursUsage">{t('form.hoursUsage')}</Label>
        <Input id="hoursUsage" type="number" step="0.1" value={hoursUsage} onChange={(e) => setHoursUsage(e.target.value)} placeholder={t('form.hoursPlaceholder')} required />
      </div>
      <div>
        <Label htmlFor="quantity">{t('form.quantity')}</Label>
        <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={t('form.quantityPlaceholder')} required />
      </div>
      <div>
        <Label htmlFor="estimatekWh">{t('form.estimateKwh')}</Label>
        <Input id="estimatekWh" type="number" step="0.01" value={(parseFloat(watt) / 1000) * parseFloat(hoursUsage) * parseFloat(quantity)} readOnly />
      </div>
      <Button type="submit" className="w-full">
        {t('buttons.addItem')}
      </Button>
    </form>
  );
}
