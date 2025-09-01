"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { exportToPDF } from "@/lib/pdfExport";
import { Plus, Settings, FileUp, Zap, Package, BarChart3, Sun, Github, Coffee, Trash2, RotateCcw } from "lucide-react";
import ItemForm from "./items/form";
import SolarForm from "./solar/form";
import { useTranslation } from "@/lib/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Item {
  id: string;
  name: string;
  watt: number;
  quantity: number;
  hoursUsage: number;
  estimatekWh: number;
}

interface Stats {
  totalItems: number;
  totalkWh: number;
  avgWattPerItem: number;
  solarPanelsNeeded: number;
}

interface SolarConfig {
  peakSunHours: number;
  panelWatts: number;
  systemEfficiency: number;
}

export default function Home() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [solarConfig, setSolarConfig] = useState<SolarConfig>({
    peakSunHours: 5,
    panelWatts: 300,
    systemEfficiency: 85,
  });
  const [stats, setStats] = useState<Stats>({
    totalItems: 0,
    totalkWh: 0,
    avgWattPerItem: 0,
    solarPanelsNeeded: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedItems = localStorage.getItem("solar-calculator-items");
    const savedConfig = localStorage.getItem("solar-calculator-config");

    if (savedItems) {
      try {
        const parsedItems = JSON.parse(savedItems);
        setItems(parsedItems);
      } catch (error) {
        console.error("Error parsing saved items:", error);
      }
    }

    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setSolarConfig(parsedConfig);
      } catch (error) {
        console.error("Error parsing saved config:", error);
      }
    }

    setIsLoaded(true);
  }, []);

  // Save items to localStorage whenever items change (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("solar-calculator-items", JSON.stringify(items));
    }
  }, [items, isLoaded]);

  // Save solar config to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("solar-calculator-config", JSON.stringify(solarConfig));
    }
  }, [solarConfig, isLoaded]);

  // Recalculate stats when items or config change
  useEffect(() => {
    const newStats = calculateStats(items, solarConfig);
    setStats(newStats);
  }, [items, solarConfig]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [solarModalOpen, setSolarModalOpen] = useState(false);

  const calculateStats = (itemsList: Item[], config: SolarConfig) => {
    const totalItems = itemsList.reduce((sum, item) => sum + item.quantity, 0);

    // Use estimatekWh from the form instead of calculating from watt * hours
    const totalkWh = itemsList.reduce((sum, item) => sum + item.estimatekWh, 0);
    const totalWatt = itemsList.reduce((sum, item) => sum + item.watt * item.quantity, 0);
    const avgWattPerItem = totalItems > 0 ? totalWatt / totalItems : 0;

    // Calculate solar panels needed based on configuration
    const dailyPanelOutput = (config.panelWatts / 1000) * config.peakSunHours * (config.systemEfficiency / 100);
    const solarPanelsNeeded = Math.ceil(totalkWh / dailyPanelOutput);

    return {
      totalItems,
      totalkWh,
      avgWattPerItem,
      solarPanelsNeeded,
    };
  };

  const addItem = (item: Omit<Item, "id">) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
    };
    setItems([...items, newItem]);
    setItemModalOpen(false); // Close modal after adding item
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const updateSolarConfig = (config: SolarConfig) => {
    setSolarConfig(config);
    setSolarModalOpen(false); // Close modal after updating config
  };

  const handleExportPDF = () => {
    exportToPDF(items, stats, solarConfig);
  };

  const handleReset = () => {
    // Clear localStorage
    localStorage.removeItem("solar-calculator-items");
    localStorage.removeItem("solar-calculator-config");

    // Reset state to initial values
    setItems([]);
    setSolarConfig({
      peakSunHours: 5,
      panelWatts: 300,
      systemEfficiency: 85,
    });
  };

  return (
    <div className="flex flex-col min-h-screen p-8 bg-background">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between">
          {/* Centered Title */}
          <div className="flex flex-1 items-center justify-center gap-3">
            <img src="/logo.svg" alt={t("common.logoAlt")} className="w-10 h-10" />
            <h1 className="text-4xl font-bold text-emerald-800">{t("common.title")}</h1>
          </div>

          {/* Language Switcher aligned to end */}
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        <p className="text-emerald-600">{t("common.description")}</p>
      </div>

      <div className="flex-1">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                {t("buttons.addItem")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("form.addNewItem")}</DialogTitle>
              </DialogHeader>
              <ItemForm onAddItem={addItem} />
            </DialogContent>
          </Dialog>

          <Dialog open={solarModalOpen} onOpenChange={setSolarModalOpen}>
            <DialogTrigger asChild>
              <Button variant="accent" size="lg">
                <Settings className="w-4 h-4 mr-2" />
                {t("buttons.configureSolar")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("form.solarConfiguration")}</DialogTitle>
              </DialogHeader>
              <SolarForm onConfigUpdate={updateSolarConfig} currentConfig={solarConfig} />
            </DialogContent>
          </Dialog>

          <Button variant="secondary" size="lg" onClick={handleExportPDF} disabled={items.length === 0}>
            <FileUp className="w-4 h-4 mr-2" />
            {t("buttons.exportPDF")}
          </Button>

          {items.length > 0 && (
            <Button variant="destructive" size="lg" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {t("buttons.resetData")}
            </Button>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                {t("stats.totalKwh")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalkWh.toFixed(2)}</p>
              <p className="text-sm text-gray-500">{t("stats.perDay")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                {t("stats.totalItems")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                {t("stats.avgWattPerItem")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.avgWattPerItem.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-emerald-600" />
                {t("stats.solarPanelsNeeded")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{stats.solarPanelsNeeded}</p>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("table.itemsList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t("table.noItems")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.itemName")}</TableHead>
                    <TableHead>{t("table.wattPerItem")}</TableHead>
                    <TableHead>{t("table.hoursPerDay")}</TableHead>
                    <TableHead>{t("table.quantity")}</TableHead>
                    <TableHead>{t("table.estimateKwh")}</TableHead>
                    <TableHead>{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.watt}</TableCell>
                      <TableCell>{item.hoursUsage}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.estimatekWh.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-4">
        <div className="flex flex-col mt-2 md:flex-row justify-between items-center gap-4">
          <div className="text-lg font-semibold text-primary">{t("common.title")}</div>
          <div className="text-sm text-muted-foreground">
            {t("footer.madeBy")}{" "}
            <a href="https://azuanalias.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-outline transitiolors">
              Azuan Alias
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/azuanalias92"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="w-4 h-4" />
              {t("footer.github")}
            </a>
            <a
              href="https://buymeacoffee.com/azuanalias"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Coffee className="w-4 h-4" />
              {t("footer.buyMeCoffee")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
