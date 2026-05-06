import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { MdClose, MdDelete, MdDownload, MdSave, MdUploadFile } from "react-icons/md";
import { bulkUpsertAllowedEmails } from "../../services/api";
import { downloadAllowedEmailsTemplate, parseAllowedEmailsFile } from "../../utils/allowedEmailsImport";

export default function AllowedEmailsUploadButton({ onImported }) {
  const inputRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setReading(true);
    try {
      const rows = await parseAllowedEmailsFile(file);
      if (rows.length === 0) {
        toast.error("No employees found in this Excel file.");
        return;
      }
      setPreview({ fileName: file.name, rows });
    } catch (err) {
      toast.error(err.message || "Excel upload failed.");
    } finally {
      setReading(false);
    }
  }

  function updateRow(index, field, value) {
    setPreview((current) => {
      const rows = [...current.rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...current, rows };
    });
  }

  function removeRow(index) {
    setPreview((current) => ({
      ...current,
      rows: current.rows.filter((_, i) => i !== index),
    }));
  }

  async function savePreview() {
    const rows = (preview?.rows || []).filter((row) => row.employee_name.trim() && (row.outlook_email || row.gmail));
    if (rows.length === 0) {
      toast.error("Keep at least one employee with an email.");
      return;
    }

    const invalidOutlook = rows.find((row) => row.outlook_email && !row.outlook_email.trim().toLowerCase().endsWith("@mepstra.com"));
    if (invalidOutlook) {
      toast.error(`${invalidOutlook.employee_name}: Outlook email must end with @mepstra.com`);
      return;
    }

    const duplicateEmail = rows.find((row) => {
      const outlook = row.outlook_email?.trim().toLowerCase();
      const office = row.gmail?.trim().toLowerCase();
      return outlook && office && outlook === office;
    });
    if (duplicateEmail) {
      toast.error(`${duplicateEmail.employee_name}: Outlook and Office email must be different`);
      return;
    }

    setSaving(true);
    try {
      const payload = rows.map((row) => ({
        employee_name: row.employee_name.trim(),
        outlook_email: row.outlook_email?.trim().toLowerCase() || undefined,
        gmail: row.gmail?.trim().toLowerCase() || undefined,
        notes: row.notes?.trim() || undefined,
        casual_leaves: Number(row.casual_leaves),
        sick_leaves: Number(row.sick_leaves),
        optional_leaves: Number(row.optional_leaves),
      }));
      const res = await bulkUpsertAllowedEmails(payload);
      toast.success(`${res.data.created} added, ${res.data.updated} updated from ${preview.fileName}`);
      setPreview(null);
      onImported?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update whitelist.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={downloadAllowedEmailsTemplate}
          className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          title="Download Excel template"
        >
          <MdDownload className="text-lg" />
          Template
        </button>
        <button
          type="button"
          disabled={reading || saving}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          title="Upload employee whitelist Excel"
        >
          <MdUploadFile className="text-lg" />
          {reading ? "Reading..." : "Upload Excel"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={handleUpload} />

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 text-white">
              <div>
                <h3 className="text-base font-bold">Review Whitelist Upload</h3>
                <p className="text-xs text-slate-400">{preview.fileName} - {preview.rows.length} employee(s) found</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" title="Close">
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-blue-50 text-xs uppercase tracking-wider text-blue-500">
                  <tr>
                    <th className="px-3 py-3 text-left font-bold">Employee Name</th>
                    <th className="px-3 py-3 text-left font-bold">Outlook Email</th>
                    <th className="px-3 py-3 text-left font-bold">Office Email</th>
                    <th className="px-3 py-3 text-left font-bold">CL</th>
                    <th className="px-3 py-3 text-left font-bold">SL</th>
                    <th className="px-3 py-3 text-left font-bold">OL</th>
                    <th className="px-3 py-3 text-left font-bold">Notes</th>
                    <th className="w-12 px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={`${row.employee_name}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      {[
                        ["employee_name", "text", "Employee name"],
                        ["outlook_email", "email", "employee@mepstra.com"],
                        ["gmail", "email", "employee@gmail.com"],
                        ["casual_leaves", "number", "12"],
                        ["sick_leaves", "number", "6"],
                        ["optional_leaves", "number", "2"],
                        ["notes", "text", "Notes"],
                      ].map(([field, type, placeholder]) => (
                        <td key={field} className="border-t border-blue-50 px-3 py-2">
                          <input
                            type={type}
                            min={type === "number" ? 0 : undefined}
                            value={row[field] || ""}
                            placeholder={placeholder}
                            onChange={(e) => updateRow(index, field, type === "number" ? Number(e.target.value) : e.target.value)}
                            className="w-full rounded-lg border border-blue-100 px-2.5 py-2 text-xs focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </td>
                      ))}
                      <td className="border-t border-blue-50 px-3 py-2 text-center">
                        <button type="button" onClick={() => removeRow(index)} className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600" title="Remove row">
                          <MdDelete />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-blue-100 px-5 py-4">
              <button type="button" onClick={() => setPreview(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={savePreview}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
              >
                <MdSave />
                {saving ? "Saving..." : "Update Whitelist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
