"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Item {
  name: string;
  kwh: number;
  quantity: number;
  hoursUsage: number;
}

interface ItemFormProps {
  onAddItem: (item: Item) => void;
}

export default function ItemForm({ onAddItem }: ItemFormProps) {
  const [name, setName] = useState<string>("");
  const [kwh, setKwh] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [hoursUsage, setHoursUsage] = useState<string>("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse form data
    const kwhValue = parseFloat(kwh) || 0;
    const quantityValue = parseInt(quantity) || 0;
    const hoursUsageValue = parseFloat(hoursUsage) || 0;
    
    if (name.trim() && kwhValue > 0 && quantityValue > 0 && hoursUsageValue > 0) {
      const item: Item = {
        name: name.trim(),
        kwh: kwhValue,
        quantity: quantityValue,
        hoursUsage: hoursUsageValue,
      };
      
      // Add the item
      onAddItem(item);
      
      // Reset form
      setName("");
      setKwh("");
      setQuantity("");
      setHoursUsage("");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Add Item</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Light bulb"
              required
            />
          </div>
          <div>
            <Label htmlFor="kwh">kWh per item</Label>
            <Input
              id="kwh"
              type="number"
              step="0.01"
              value={kwh}
              onChange={(e) => setKwh(e.target.value)}
              placeholder="e.g., 0.06"
              required
            />
          </div>
          <div>
             <Label htmlFor="quantity">Quantity</Label>
             <Input
               id="quantity"
               type="number"
               value={quantity}
               onChange={(e) => setQuantity(e.target.value)}
               placeholder="e.g., 5"
               required
             />
           </div>
           <div>
             <Label htmlFor="hoursUsage">Hours of Usage per Day</Label>
             <Input
               id="hoursUsage"
               type="number"
               step="0.1"
               value={hoursUsage}
               onChange={(e) => setHoursUsage(e.target.value)}
               placeholder="e.g., 8"
               required
             />
           </div>
          <Button type="submit" className="w-full">
            Add Item
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
