import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export const exportToPDF = (items: Item[], stats: Stats, solarConfig: SolarConfig) => {
  const doc = new jsPDF();

  // Header with modern styling
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(34, 197, 94); // Green theme color
  doc.text("Solar Panel Estimator Report", 20, 25);

  // Subtitle line
  doc.setLineWidth(0.5);
  doc.setDrawColor(34, 197, 94);
  doc.line(20, 30, 190, 30);

  // Date
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated on: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
    20,
    35
  );

  // Solar Configuration Section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Solar System Configuration", 20, 45);

  // Configuration background
  doc.setFillColor(248, 250, 252);
  doc.rect(20, 50, 170, 30, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Peak Sun Hours: ${solarConfig.peakSunHours} hours/day`, 25, 55);
  doc.text(`Panel Watts: ${solarConfig.panelWatts}W`, 25, 65);
  doc.text(`System Efficiency: ${solarConfig.systemEfficiency}%`, 25, 75);

  // Statistics Section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Energy Statistics", 20, 90);

  // Statistics background
  doc.setFillColor(240, 253, 244);
  doc.rect(20, 95, 170, 40, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Total Items: ${stats.totalItems}`, 25, 100);
  doc.text(`Total Daily Energy: ${stats.totalkWh.toFixed(2)} Watt/day`, 25, 110);
  doc.text(`Average Energy per Item: ${stats.avgWattPerItem.toFixed(2)} Watt/day`, 25, 120);
  doc.setFont("helvetica", "bold");
  doc.text(`Solar Panels Needed: ${stats.solarPanelsNeeded}`, 25, 130);

  // Items Table
  if (items.length > 0) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Items Breakdown", 20, 145);

    const tableData = items.map((item) => [item.name, `${item.watt} Watt`, `${item.quantity}`, `${item.hoursUsage}h`, `${(item.estimatekWh * item.quantity).toFixed(2)} Watt`]);

    autoTable(doc, {
      startY: 150,
      head: [["Item Name", "Watt per Use", "Quantity", "Hours/Day", "Daily Watt"]],
      body: tableData,
      theme: "striped",
      styles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: [60, 60, 60],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 20, right: 20 },
    });
  }

  // Save the PDF
  doc.save(`solar-panel-estimator-${new Date().toISOString().split("T")[0]}.pdf`);
};
