import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Item {
  id: string;
  name: string;
  watt: number;
  quantity: number;
  hoursUsage: number;
}

interface Stats {
  totalItems: number;
  totalWatt: number;
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
  
  // Title
  doc.setFontSize(20);
  doc.text('Solar Calculator Report', 20, 20);
  
  // Date
  doc.setFontSize(12);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
  
  // Solar Configuration Section
  doc.setFontSize(16);
  doc.text('Solar System Configuration', 20, 55);
  
  doc.setFontSize(12);
  doc.text(`Peak Sun Hours: ${solarConfig.peakSunHours} hours/day`, 20, 70);
  doc.text(`Panel Watts: ${solarConfig.panelWatts}W`, 20, 80);
  doc.text(`System Efficiency: ${solarConfig.systemEfficiency}%`, 20, 90);
  
  // Statistics Section
  doc.setFontSize(16);
  doc.text('Energy Statistics', 20, 110);
  
  doc.setFontSize(12);
  doc.text(`Total Items: ${stats.totalItems}`, 20, 125);
  doc.text(`Total Daily Energy: ${stats.totalWatt.toFixed(2)} Watt/day`, 20, 135);
  doc.text(`Average Energy per Item: ${stats.avgWattPerItem.toFixed(2)} Watt/day`, 20, 145);
  doc.text(`Solar Panels Needed: ${stats.solarPanelsNeeded}`, 20, 155);
  
  // Items Table
  if (items.length > 0) {
    doc.setFontSize(16);
    doc.text('Items Breakdown', 20, 175);
    
    const tableData = items.map(item => [
      item.name,
      `${item.watt} Watt`,
      `${item.quantity}`,
      `${item.hoursUsage}h`,
      `${(item.watt * item.quantity * item.hoursUsage).toFixed(2)} Watt`
    ]);
    
    autoTable(doc, {
      startY: 185,
      head: [['Item Name', 'Watt per Use', 'Quantity', 'Hours/Day', 'Daily Watt']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
    });
  }
  
  // Save the PDF
  doc.save(`solar-calculator-report-${new Date().toISOString().split('T')[0]}.pdf`);
};