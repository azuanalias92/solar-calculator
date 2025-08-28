"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportToPDF } from "@/lib/pdfExport";
import ItemForm from "./items/form";
import SolarForm from "./solar/form";

interface Item {
  id: string;
  name: string;
  kwh: number;
  quantity: number;
  hoursUsage: number;
}

interface Stats {
  totalItems: number;
  totalKwh: number;
  avgKwhPerItem: number;
  solarPanelsNeeded: number;
}

interface SolarConfig {
  peakSunHours: number;
  panelWatts: number;
  systemEfficiency: number;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [solarConfig, setSolarConfig] = useState<SolarConfig>({
    peakSunHours: 5,
    panelWatts: 300,
    systemEfficiency: 85,
  });
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalKwh: 0,
    avgKwhPerItem: 0,
    solarPanelsNeeded: 0,
  });
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [solarModalOpen, setSolarModalOpen] = useState(false);

  const calculateStats = (itemsList: Item[], config: SolarConfig) => {
    const totalItems = itemsList.reduce((sum, item) => sum + item.quantity, 0);
    const totalKwh = itemsList.reduce((sum, item) => sum + item.kwh * item.quantity * item.hoursUsage, 0);
    const avgKwhPerItem = totalItems > 0 ? totalKwh / totalItems : 0;

    // Calculate solar panels needed based on configuration
    const dailyPanelOutput = (config.panelWatts / 1000) * config.peakSunHours * (config.systemEfficiency / 100);
    const solarPanelsNeeded = Math.ceil(totalKwh / dailyPanelOutput);

    return {
      totalItems,
      totalKwh,
      avgKwhPerItem,
      solarPanelsNeeded,
    };
  };

  const addItem = (item: Omit<Item, "id">) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);

    const newStats = calculateStats(updatedItems, solarConfig);
    setStats(newStats);
    setItemModalOpen(false); // Close modal after adding item
  };

  const updateSolarConfig = (config: SolarConfig) => {
    setSolarConfig(config);
    const newStats = calculateStats(items, config);
    setStats(newStats);
    setSolarModalOpen(false); // Close modal after updating config
  };

  const handleExportPDF = () => {
    exportToPDF(items, stats, solarConfig);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Solar Calculator Dashboard</h1>

      <div className="flex-1">
        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mb-8">
          <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg">Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
              </DialogHeader>
              <ItemForm onAddItem={addItem} />
            </DialogContent>
          </Dialog>

          <Dialog open={solarModalOpen} onOpenChange={setSolarModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg">
                Configure Solar System
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solar Panel Configuration</DialogTitle>
              </DialogHeader>
              <SolarForm onConfigUpdate={updateSolarConfig} currentConfig={solarConfig} />
            </DialogContent>
          </Dialog>

          <Button variant="secondary" size="lg" onClick={handleExportPDF} disabled={items.length === 0}>
            Export to PDF
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total kWh</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalKwh.toFixed(2)}</p>
              <p className="text-sm text-gray-500">per day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avg kWh/Item</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgKwhPerItem.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solar Panels</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.solarPanelsNeeded}</p>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Items List</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items added yet. Use the form above to add items.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>kWh per Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Hours/Day</TableHead>
                    <TableHead>Daily kWh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.kwh}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.hoursUsage}</TableCell>
                      <TableCell>{(item.kwh * item.quantity * item.hoursUsage).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col mt-2 md:flex-row justify-between items-center gap-4">
          <div className="text-lg font-semibold text-primary">Solar Calculator</div>
          <div className="text-sm text-muted-foreground">
            Made by{" "}
            <a href="https://azuanalias.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-outline transitiolors">
              Azuan Alias
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/azuanalias92" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              GitHub
            </a>
            <a href="https://buymeacoffee.com/azuanalias" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Buy Me Coffee
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
