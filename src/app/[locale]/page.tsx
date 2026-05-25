"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import GoogleAuthButton from "@/components/GoogleAuthButton";
import { getAuthState, type AuthState } from "@/lib/auth";

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
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const apiBaseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787", []);
  const [auth, setAuth] = useState<AuthState | null>(null);
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const skipNextSaveRef = useRef(true);

  useEffect(() => {
    const refresh = () => setAuth(getAuthState());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("kirasolar:auth", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("kirasolar:auth", refresh);
    };
  }, []);

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      setMessage(null);
      setLoading(true);
      setIsLoaded(false);
      skipNextSaveRef.current = true;

      if (!auth?.token) {
        if (!canceled) {
          setItems([]);
          setSolarConfig({ peakSunHours: 5, panelWatts: 300, systemEfficiency: 85 });
        }
        if (!canceled) setIsLoaded(true);
        if (!canceled) setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/calculator/state`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!res.ok) {
          if (!canceled) setMessage("Failed to load from backend");
          if (!canceled) setIsLoaded(true);
          if (!canceled) setLoading(false);
          return;
        }
        const payload = (await res.json()) as {
          data: { items: Item[]; config: SolarConfig };
        };
        if (!canceled) {
          setItems(payload.data.items ?? []);
          setSolarConfig(
            payload.data.config ?? { peakSunHours: 5, panelWatts: 300, systemEfficiency: 85 },
          );
          setIsLoaded(true);
        }
      } catch {
        if (!canceled) {
          setMessage(`Unable to reach API at ${apiBaseUrl}. Start the backend or set NEXT_PUBLIC_API_BASE_URL.`);
          setIsLoaded(true);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [apiBaseUrl, auth?.token]);

  const saveRemote = async (nextItems: Item[], nextConfig: SolarConfig) => {
    if (!auth?.token) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBaseUrl}/calculator/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ items: nextItems, config: nextConfig }),
      });
      if (!res.ok) {
        setMessage("Failed to save");
        return;
      }
      setMessage("Saved");
      window.setTimeout(() => setMessage(null), 1200);
    } catch {
      setMessage(`Unable to reach API at ${apiBaseUrl}. Start the backend or set NEXT_PUBLIC_API_BASE_URL.`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!auth?.token) return;
    if (!isLoaded) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveRemote(items, solarConfig);
    }, 800);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [auth?.token, isLoaded, items, solarConfig]);

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
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
    // Reset state to initial values
    const nextItems: Item[] = [];
    const nextConfig: SolarConfig = {
      peakSunHours: 5,
      panelWatts: 300,
      systemEfficiency: 85,
    };
    setItems(nextItems);
    setSolarConfig(nextConfig);
    if (auth?.token) void saveRemote(nextItems, nextConfig);
  };

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6 lg:p-8 bg-background">
      <div className="w-full max-w-6xl mx-auto text-center mb-6 sm:mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
          <div className="hidden sm:block" />

          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <img src="/logo.svg" alt={t("common.logoAlt")} className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-800">{t("common.title")}</h1>
          </div>

          <div className="flex justify-center sm:justify-end items-center gap-3">
            <GoogleAuthButton locale={locale} />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <div className="inline-flex gap-2 rounded-lg border border-input bg-background p-1">
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") || pathname.includes("/rates") ? "outline" : "secondary"}>
              <Link href={`/${locale}`}>Calculator</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/bill-ev") ? "secondary" : "outline"}>
              <Link href={`/${locale}/bill-ev`}>Bill EV</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/rates") ? "secondary" : "outline"}>
              <Link href={`/${locale}/rates`}>Rates</Link>
            </Button>
            <Button asChild size="sm" variant={pathname.includes("/usage") ? "secondary" : "outline"}>
              <Link href={`/${locale}/usage`}>Usage</Link>
            </Button>
          </div>
        </div>

        <p className="text-sm sm:text-base text-emerald-600 mt-2">{t("common.description")}</p>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 px-2 sm:px-0">
          <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto">
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
              <Button variant="accent" size="lg" className="w-full sm:w-auto">
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

          <Button variant="secondary" size="lg" onClick={handleExportPDF} disabled={items.length === 0} className="w-full sm:w-auto">
            <FileUp className="w-4 h-4 mr-2" />
            {t("buttons.exportPDF")}
          </Button>

          {items.length > 0 && (
            <Button variant="destructive" size="lg" onClick={handleReset} className="w-full sm:w-auto">
              <RotateCcw className="w-4 h-4 mr-2" />
              {t("buttons.resetData")}
            </Button>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground mb-6">
          <span>{auth?.token ? "Synced to backend" : "Login to save to backend"}</span>
          {loading ? <span> • Loading…</span> : null}
          {saving ? <span> • Saving…</span> : null}
          {message ? <span className="text-foreground"> • {message}</span> : null}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 px-2 sm:px-0">
          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                {t("stats.totalKwh")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-6">
              <p className="text-xl sm:text-2xl font-bold">{stats.totalkWh.toFixed(2)}</p>
              <p className="text-xs sm:text-sm text-gray-500">{t("stats.perDay")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                {t("stats.totalItems")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-6">
              <p className="text-xl sm:text-2xl font-bold">{stats.totalItems}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                {t("stats.avgWattPerItem")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-6">
              <p className="text-xl sm:text-2xl font-bold">{stats.avgWattPerItem.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                {t("stats.solarPanelsNeeded")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-6">
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.solarPanelsNeeded}</p>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">{t("table.itemsList")}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm sm:text-base">{t("table.noItems")}</p>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px] text-xs sm:text-sm">{t("table.itemName")}</TableHead>
                        <TableHead className="min-w-[80px] text-xs sm:text-sm">{t("table.wattPerItem")}</TableHead>
                        <TableHead className="min-w-[80px] text-xs sm:text-sm">{t("table.hoursPerDay")}</TableHead>
                        <TableHead className="min-w-[70px] text-xs sm:text-sm">{t("table.quantity")}</TableHead>
                        <TableHead className="min-w-[90px] text-xs sm:text-sm">{t("table.estimateKwh")}</TableHead>
                        <TableHead className="min-w-[80px] text-xs sm:text-sm">{t("table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">{item.name}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{item.watt}W</TableCell>
                          <TableCell className="text-xs sm:text-sm">{item.hoursUsage}h</TableCell>
                          <TableCell className="text-xs sm:text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-xs sm:text-sm font-medium">{item.estimatekWh.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => removeItem(item.id)} 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm mt-4">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4 mt-3 sm:mt-4 md:flex-row md:justify-between md:items-center px-2 sm:px-0">
          <div className="text-base sm:text-lg font-semibold text-primary text-center md:text-left">{t("common.title")}</div>
          
          <div className="text-xs sm:text-sm text-muted-foreground text-center md:text-left order-3 md:order-2">
            {t("footer.madeBy")}{" "}
            <a href="https://azuanalias.com" target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-primary hover:text-outline transition-colors">
              Azuan Alias
            </a>
          </div>
          
          <div className="flex items-center justify-center gap-3 sm:gap-4 order-2 md:order-3">
            <a
              href="https://github.com/azuanalias92"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.github")}</span>
            </a>
            <a
              href="https://ko-fi.com/azuanalias"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Coffee className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("footer.buyMeCoffee")}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
