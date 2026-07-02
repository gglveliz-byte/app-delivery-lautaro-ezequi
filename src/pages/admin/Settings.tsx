import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Settings,
  DollarSign,
  Save,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { useGetAdminReports, useUpdateSetting } from "@/hooks/useDeliveryData";
import { trpc } from "@/providers/trpc";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import AdminLayout from "@/components/AdminLayout";

export default function AdminSettings() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [settings, setSettings] = useState({
    deliveryFee: "2.50",
    commissionRate: "8.00",
    minOrderAmount: "3.00",
    appName: "YA LLEGA",
    supportPhone: "555-HELP",
    bankTransferInfo: "",
  });
  const settingsQuery = trpc.admin.settings.useQuery();
  const updateSetting = useUpdateSetting();
  const getReports = useGetAdminReports();

  useEffect(() => {
    if (!settingsQuery.data) return;
    const map: Record<string, string> = {};
    settingsQuery.data.forEach((row: any) => { map[row.key] = row.value ?? ""; });
    setSettings({
      deliveryFee: map.delivery_fee || "2.50",
      commissionRate: map.commission_rate || "8.00",
      minOrderAmount: map.min_order_amount || "3.00",
      appName: map.app_name || "YA LLEGA",
      supportPhone: map.support_phone || "555-HELP",
      bankTransferInfo: map.bank_transfer_info || "",
    });
  }, [settingsQuery.data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "app_name", value: settings.appName }),
        updateSetting.mutateAsync({ key: "support_phone", value: settings.supportPhone }),
        updateSetting.mutateAsync({ key: "delivery_fee", value: settings.deliveryFee }),
        updateSetting.mutateAsync({ key: "commission_rate", value: settings.commissionRate }),
        updateSetting.mutateAsync({ key: "min_order_amount", value: settings.minOrderAmount }),
        updateSetting.mutateAsync({ key: "bank_transfer_info", value: settings.bankTransferInfo }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (type: string, format: "pdf" | "excel") => {
    try {
      const payload: { type: string; startDate?: string; endDate?: string } = { type };
      if (dateFrom) payload.startDate = dateFrom;
      if (dateTo) payload.endDate = dateTo;
      const data = await getReports.mutateAsync(payload);
      const today = new Date().toISOString().split("T")[0];

      if (format === "pdf") {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(`YA LLEGA — Reporte de ${type}`, 14, 18);
        doc.setFontSize(10);
        const rangeText =
          dateFrom || dateTo
            ? `Rango: ${dateFrom || "—"} a ${dateTo || "—"}`
            : "Rango: todos los datos";
        doc.text(rangeText, 14, 26);

        const rows: Record<string, unknown>[] = Array.isArray(data?.rows) ? data.rows : [];
        const headers = Array.isArray(data?.columns) ? data.columns : (rows.length > 0 ? Object.keys(rows[0]) : ["Sin datos"]);
        const body = rows.map((row) =>
          headers.map((h) => {
            const val = (row as Record<string, unknown>)[h];
            return val === null || val === undefined ? "" : String(val);
          }),
        );

        autoTable(doc, {
          head: [headers],
          body,
          startY: 32,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [46, 125, 50] },
        });

        const pageCount = doc.getNumberOfPages();
        const timestamp = new Date().toLocaleString();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(
            `Generado: ${timestamp}  |  Pagina ${i} de ${pageCount}`,
            14,
            doc.internal.pageSize.height - 8,
          );
        }

        doc.save(`reporte_${type}_${today}.pdf`);
      } else {
        const excelRows: Record<string, unknown>[] = Array.isArray(data?.rows) ? data.rows : [];
        const ws = XLSX.utils.json_to_sheet(excelRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type);
        XLSX.writeFile(wb, `reporte_${type}_${today}.xlsx`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout>
      <header className="bg-white border-b border-gray-200 px-3 lg:px-4 py-2 lg:py-4">
        <div className="flex items-center gap-2 lg:gap-3">
          <button onClick={() => navigate("/admin")} className="touch-target">
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
          </button>
          <h1 className="text-base lg:text-lg font-bold text-gray-800">Configuracion</h1>
        </div>
      </header>

      <div className="lg:flex-1 lg:overflow-y-auto p-2 lg:p-4 max-w-2xl mx-auto space-y-4 lg:space-y-6">
        {settingsQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Cargando configuración...</p>
          </div>
        ) : (
          <>
            {saved && (
          <div className="bg-green-50 text-green-700 px-3 lg:px-4 py-2 lg:py-3 rounded-xl flex items-center gap-2 text-xs lg:text-sm animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Configuracion guardada
          </div>
        )}

        {/* App Settings */}
        <div className="bg-white rounded-xl card-shadow p-3 lg:p-5">
          <h2 className="text-xs lg:text-sm font-semibold text-gray-800 mb-3 lg:mb-4 flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#2E7D32]" />
            General
          </h2>
          <div className="space-y-3 lg:space-y-4">
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">Nombre de la app</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full h-9 lg:h-10 px-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">Telefono de soporte</label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full h-9 lg:h-10 px-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-white rounded-xl card-shadow p-3 lg:p-5">
          <h2 className="text-xs lg:text-sm font-semibold text-gray-800 mb-3 lg:mb-4 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#2E7D32]" />
            Financiero
          </h2>
          <div className="space-y-3 lg:space-y-4">
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">Costo de envio base ($)</label>
              <input
                type="text"
                value={settings.deliveryFee}
                onChange={(e) => setSettings({ ...settings, deliveryFee: e.target.value })}
                className="w-full h-9 lg:h-10 px-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">Comision global (%)</label>
              <input
                type="text"
                value={settings.commissionRate}
                onChange={(e) => setSettings({ ...settings, commissionRate: e.target.value })}
                className="w-full h-9 lg:h-10 px-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">Monto minimo de pedido ($)</label>
              <input
                type="text"
                value={settings.minOrderAmount}
                onChange={(e) => setSettings({ ...settings, minOrderAmount: e.target.value })}
                className="w-full h-9 lg:h-10 px-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>
          </div>
        </div>

        {/* Bank Transfer Settings */}
        <div className="bg-white rounded-xl card-shadow p-3 lg:p-5">
          <h2 className="text-xs lg:text-sm font-semibold text-gray-800 mb-3 lg:mb-4 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#2E7D32]" />
            Datos de Transferencia Bancaria
          </h2>
          <div className="space-y-3 lg:space-y-4">
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">
                Instrucciones para clientes (Banco, CVU/CBU, Alias, Titular)
              </label>
              <textarea
                value={settings.bankTransferInfo}
                onChange={(e) => setSettings({ ...settings, bankTransferInfo: e.target.value })}
                placeholder="Ej: Banco Galicia, CBU: 123... Alias: mi.alias, Titular: Juan Perez"
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20 resize-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-10 lg:h-12 bg-[#2E7D32] text-white font-medium rounded-xl hover:bg-[#1B5E20] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs lg:text-sm"
        >
          <Save className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          {saving ? "Guardando..." : "Guardar configuracion"}
        </button>

        {/* Reports Export */}
        <div className="bg-white rounded-xl card-shadow p-3 lg:p-5">
          <h2 className="text-xs lg:text-sm font-semibold text-gray-800 mb-3 lg:mb-4 flex items-center gap-2">
            <Download className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#2E7D32]" />
            Reportes exportables
          </h2>

          {/* Date range inputs */}
          <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-3 lg:mb-4">
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full h-9 lg:h-10 px-2 lg:px-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>
            <div>
              <label className="text-[10px] lg:text-xs font-medium text-gray-600 mb-1 block">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full h-9 lg:h-10 px-2 lg:px-3 border border-gray-200 rounded-lg text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-[#2E7D32]/20"
              />
            </div>
          </div>

          <div className="space-y-2 lg:space-y-3">
            {[
              { label: "Ventas", type: "sales" },
              { label: "Pedidos", type: "orders" },
              { label: "Comercios", type: "commerces" },
              { label: "Repartidores", type: "drivers" },
              { label: "Ganancias", type: "earnings" },
              { label: "Comisiones", type: "commissions" },
            ].map((report) => (
              <div key={report.type} className="flex items-center gap-1.5 lg:gap-2">
                <span className="text-[10px] lg:text-sm text-gray-700 w-20 lg:w-28 shrink-0">{report.label}</span>
                <button
                  onClick={() => handleExport(report.type, "pdf")}
                  className="flex-1 p-1.5 lg:p-2 border border-gray-200 rounded-lg lg:rounded-xl text-[10px] lg:text-sm text-gray-700 hover:bg-gray-50 hover:border-[#2E7D32] transition-all flex items-center justify-center gap-1 lg:gap-2"
                >
                  <FileText className="w-3 h-3 lg:w-4 lg:h-4 text-[#2E7D32]" />
                  PDF
                </button>
                <button
                  onClick={() => handleExport(report.type, "excel")}
                  className="flex-1 p-1.5 lg:p-2 border border-gray-200 rounded-lg lg:rounded-xl text-[10px] lg:text-sm text-gray-700 hover:bg-gray-50 hover:border-[#2E7D32] transition-all flex items-center justify-center gap-1 lg:gap-2"
                >
                  <FileSpreadsheet className="w-3 h-3 lg:w-4 lg:h-4 text-[#2E7D32]" />
                  <span className="hidden lg:inline">Excel</span>
                  <span className="lg:hidden">XLS</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </AdminLayout>
  );
}
