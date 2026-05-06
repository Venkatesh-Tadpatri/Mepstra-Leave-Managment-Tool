import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { MdClose, MdDelete, MdDownload, MdSave, MdUploadFile } from "react-icons/md";
import { downloadHolidayCalendarTemplate, parseHolidayCalendarFile } from "../../utils/holidayCalendarImport";
import { bulkUpsertHolidays } from "../../services/api";

export default function HolidayCalendarUploadButton({ year, onImported, className = "" }) {
  const inputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const holidays = await parseHolidayCalendarFile(file, year || new Date().getFullYear());
      if (holidays.length === 0) {
        toast.error("No holidays found in this Excel file.");
        return;
      }

      setPreview({ fileName: file.name, holidays });
    } catch (err) {
      toast.error(err.message || err.response?.data?.detail || "Excel upload failed.");
    } finally {
      setImporting(false);
    }
  }

  function updatePreviewRow(index, field, value) {
    setPreview((current) => {
      const holidays = [...current.holidays];
      holidays[index] = { ...holidays[index], [field]: value };
      if (field === "date") holidays[index].year = Number(value.slice(0, 4));
      return { ...current, holidays };
    });
  }

  function removePreviewRow(index) {
    setPreview((current) => ({
      ...current,
      holidays: current.holidays.filter((_, i) => i !== index),
    }));
  }

  async function savePreview() {
    const holidays = (preview?.holidays || []).filter((holiday) => holiday.date && holiday.name.trim());
    if (holidays.length === 0) {
      toast.error("Keep at least one valid holiday row.");
      return;
    }

    setSaving(true);
    try {
      const payload = holidays.map((holiday) => ({
        ...holiday,
        name: holiday.name.trim(),
        year: Number(holiday.date.slice(0, 4)),
      }));
      const res = await bulkUpsertHolidays(payload);
      toast.success(`${res.data.created} added, ${res.data.updated} updated from ${preview.fileName}`);
      setPreview(null);
      onImported?.(payload);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Calendar save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={importing || saving}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        title="Upload holiday calendar Excel template"
      >
        <MdUploadFile className="text-lg" />
        {importing ? "Reading..." : "Upload Excel"}
      </button>
      <button
        type="button"
        onClick={() => downloadHolidayCalendarTemplate(year || new Date().getFullYear())}
        className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-white/30"
        title="Download Excel template"
      >
        <MdDownload className="text-lg" />
        Template
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xls,.xlsx"
        onChange={handleUpload}
        className="hidden"
      />
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-4 text-white">
              <div>
                <h3 className="text-base font-bold">Review Uploaded Calendar</h3>
                <p className="text-xs text-white/70">{preview.fileName} - {preview.holidays.length} row(s) found</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg p-2 text-white/75 hover:bg-white/10 hover:text-white"
                title="Close"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-indigo-50 text-xs uppercase tracking-wider text-indigo-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Date</th>
                    <th className="px-4 py-3 text-left font-bold">Holiday Name</th>
                    <th className="px-4 py-3 text-left font-bold">Type</th>
                    <th className="w-14 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.holidays.map((holiday, index) => (
                    <tr key={`${holiday.date}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="border-t border-indigo-50 px-4 py-2">
                        <input
                          type="date"
                          value={holiday.date}
                          onChange={(e) => updatePreviewRow(index, "date", e.target.value)}
                          className="w-full rounded-lg border border-indigo-100 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-gray-800 bg-white"
                        />
                      </td>
                      <td className="border-t border-indigo-50 px-4 py-2">
                        <input
                          value={holiday.name}
                          onChange={(e) => updatePreviewRow(index, "name", e.target.value)}
                          className="w-full rounded-lg border border-indigo-100 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-gray-800 bg-white"
                        />
                      </td>
                      <td className="border-t border-indigo-50 px-4 py-2">
                        <select
                          value={holiday.holiday_type}
                          onChange={(e) => updatePreviewRow(index, "holiday_type", e.target.value)}
                          className="w-full rounded-lg border border-indigo-100 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-gray-800 bg-white"
                        >
                          <option value="mandatory">Mandatory</option>
                          <option value="optional">Optional</option>
                        </select>
                      </td>
                      <td className="border-t border-indigo-50 px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removePreviewRow(index)}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove row"
                        >
                          <MdDelete />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-indigo-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={savePreview}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
              >
                <MdSave />
                {saving ? "Saving..." : "Update Holidays"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
