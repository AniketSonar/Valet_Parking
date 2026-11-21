import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./PerformanceReport.css";

const periodLabels = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function PerformanceReport({ type, report, hotelName, period, loading, selectedHotel }) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const isValetReport = type === "valet";
  const title = isValetReport ? "Valet Report" : "Manager Report";
  const rows = useMemo(
    () => isValetReport ? report?.valetPerformance || [] : report?.managerPerformance || [],
    [isValetReport, report?.managerPerformance, report?.valetPerformance]
  );

  const summary = useMemo(() => {
    if (isValetReport) {
      const ratingCount = rows.reduce((total, row) => total + Number(row.rating_count || 0), 0);
      const ratingTotal = rows.reduce(
        (total, row) => total + Number(row.average_rating || 0) * Number(row.rating_count || 0),
        0
      );
      return [
        { label: "Valets", value: rows.length },
        { label: "Vehicles Parked", value: rows.reduce((total, row) => total + Number(row.check_ins || 0), 0) },
        { label: "Returns Completed", value: rows.reduce((total, row) => total + Number(row.returnsCompleted || 0), 0) },
        { label: "Average Rating", value: ratingCount ? (ratingTotal / ratingCount).toFixed(1) : "—" },
      ];
    }

    const hotelReports = (report?.hotelReports || []).filter(
      (hotel) => selectedHotel === "all" || hotel.hotel_id === selectedHotel
    );
    const hotelStaffCount = hotelReports.reduce(
      (total, hotel) => total + Number(hotel.staffCount || 0),
      0
    );
    return [
      { label: "Managers", value: rows.length },
      { label: "Staff Count", value: hotelStaffCount },
      { label: "Vehicles Handled", value: rows.reduce((total, row) => total + Number(row.total_sessions || 0), 0) },
      { label: "Revenue", value: formatCurrency(rows.reduce((total, row) => total + Number(row.total_revenue || 0), 0)) },
    ];
  }, [isValetReport, report?.hotelReports, rows, selectedHotel]);

  const tableHeaders = isValetReport
    ? ["Valet Name", "Branch", "Vehicles Parked", "Avg Retrieval Time", "Rating", "Status"]
    : ["Manager Name", "Branch", "Staff Count", "Vehicles Handled", "Revenue", "Status"];

  const tableRows = rows.map((row) =>
    isValetReport
      ? [
          row.valet_name || row.name || "—",
          row.hotel_name || "Unassigned",
          Number(row.check_ins || 0),
          row.average_retrieval_minutes == null ? "—" : `${row.average_retrieval_minutes} min`,
          row.average_rating == null ? "—" : `${Number(row.average_rating).toFixed(1)} / 5`,
          row.is_active === false ? "Inactive" : "Active",
        ]
      : [
          row.manager_name || row.name || "—",
          row.hotel_name || "Unassigned",
          Number(row.staff_count || 0),
          Number(row.total_sessions || 0),
          formatCurrency(row.total_revenue),
          row.is_active === false ? "Inactive" : "Active",
        ]
  );

  const downloadPdf = () => {
    if (!rows.length || exporting) return;
    setExporting(true);
    setExportError("");
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const date = new Date();
      const dateLabel = date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      doc.setFillColor(66, 35, 94);
      doc.rect(0, 0, pageWidth, 27, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text(title, 14, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Branch: ${hotelName}    Period: ${periodLabels[period] || period}    Generated: ${dateLabel}`, 14, 20);
      doc.setTextColor(35, 31, 38);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("KPI Summary", 14, 36);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        summary.map((item) => `${item.label}: ${String(item.value).replace(/^₹/, "INR ")}`).join("    |    "),
        14,
        43
      );

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows.map((row) => row.map((cell) =>
          typeof cell === "string" ? cell.replace(/^₹/, "INR ") : cell
        )),
        startY: 50,
        margin: { left: 14, right: 14, bottom: 15 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 3.2, textColor: [50, 45, 54] },
        headStyles: { fillColor: [66, 35, 94], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 246, 250] },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(110, 102, 116);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 7, { align: "right" });
        },
      });
      doc.save(`${isValetReport ? "valet" : "manager"}-report-${period}-${date.toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error(`Failed to export ${title.toLowerCase()}:`, error);
      setExportError(error?.message || "Unable to generate the PDF report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="performance-report" aria-label={title}>
      <div className="performance-report-heading">
        <div>
          <h3>{title}</h3>
          <p>{hotelName} · {periodLabels[period] || period} performance</p>
        </div>
        <button
          type="button"
          className="performance-report-download"
          onClick={downloadPdf}
          disabled={loading || !rows.length || exporting}
        >
          <Download size={15} />
          {exporting ? "Preparing PDF..." : "Download PDF"}
        </button>
      </div>

      <div className="performance-report-kpis">
        {summary.map((item) => (
          <div className="performance-report-kpi" key={item.label}>
            <span>{item.label}</span>
            <strong>{loading ? "—" : item.value}</strong>
          </div>
        ))}
      </div>

      {isValetReport && (
        <p className="performance-report-note">
          Retrieval time is unavailable because the system does not record when a retrieval request starts.
        </p>
      )}
      {exportError && <p className="performance-report-error" role="alert">{exportError}</p>}

      <div className="performance-report-table-wrap">
        <table className="performance-report-table">
          <thead>
            <tr>{tableHeaders.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={tableHeaders.length} className="performance-report-empty">Loading report…</td></tr>
            ) : rows.length ? (
              rows.map((row, index) => (
                <tr key={isValetReport ? row.valet_id || index : row.manager_id || index}>
                  {tableRows[index].map((cell, cellIndex) => (
                    <td key={`${cellIndex}-${String(cell)}`}>
                      {cellIndex === tableHeaders.length - 1 ? (
                        <span className={`performance-report-status ${cell === "Active" ? "is-active" : "is-inactive"}`}>{cell}</span>
                      ) : cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr><td colSpan={tableHeaders.length} className="performance-report-empty">No report data for this branch and period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default PerformanceReport;
