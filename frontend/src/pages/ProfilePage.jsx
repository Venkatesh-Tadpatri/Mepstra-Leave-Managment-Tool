import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import { getMe, updateMe, uploadAvatar, removeAvatar } from "../services/api";
import { updateUser } from "../store/slices/authSlice";
import {
  MdPerson, MdEmail, MdPhone, MdWork, MdCalendarMonth,
  MdEdit, MdSave, MdClose, MdVerified, MdCameraAlt, MdDeleteOutline,
  MdCake, MdFavorite, MdWc, MdZoomIn, MdZoomOut, MdCheck,
} from "react-icons/md";

async function getCroppedBlob(imageSrc, pixelCrop) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  );
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

function CropModal({ src, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  async function handleConfirm() {
    const blob = await getCroppedBlob(src, croppedAreaPixels);
    onConfirm(blob);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">Adjust Photo</h3>
            <p className="text-slate-400 text-xs mt-0.5">Drag to reposition · Pinch or scroll to zoom</p>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <MdClose />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative w-full" style={{ height: 300, background: "#111" }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-5 py-4 bg-gray-50 flex items-center gap-3">
          <MdZoomOut className="text-gray-400 text-xl flex-shrink-0" />
          <input
            type="range" min={1} max={3} step={0.01}
            value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-blue-600 h-1.5 rounded-full cursor-pointer"
          />
          <MdZoomIn className="text-gray-400 text-xl flex-shrink-0" />
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
            <MdCheck /> Apply & Upload
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const API_BASE = "http://localhost:8000";

const ROLE_GRADIENTS = {
  employee:     { gradient: "from-blue-500 to-blue-700",   badge: "bg-blue-100 text-blue-700" },
  team_lead:    { gradient: "from-teal-500 to-teal-700",   badge: "bg-teal-100 text-teal-700" },
  manager:      { gradient: "from-violet-500 to-purple-700", badge: "bg-violet-100 text-violet-700" },
  hr:           { gradient: "from-orange-500 to-orange-700", badge: "bg-orange-100 text-orange-700" },
  main_manager: { gradient: "from-red-500 to-red-700",     badge: "bg-red-100 text-red-700" },
  admin:        { gradient: "from-gray-600 to-gray-800",   badge: "bg-gray-100 text-gray-700" },
};

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    date_of_birth: user?.date_of_birth || "",
    joining_date: user?.joining_date || "",
    gender: user?.gender || "",
    marital_status: user?.marital_status || "",
    marriage_date: user?.marriage_date || "",
  });

  useEffect(() => {
    getMe().then((r) => {
      dispatch(updateUser(r.data));
      setForm((f) => ({
        ...f,
        full_name: r.data.full_name || "",
        phone: r.data.phone || "",
        date_of_birth: r.data.date_of_birth || "",
        joining_date: r.data.joining_date || "",
        gender: r.data.gender || "",
        marital_status: r.data.marital_status || "",
        marriage_date: r.data.marriage_date || "",
      }));
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone || undefined,
        date_of_birth: form.date_of_birth || undefined,
        joining_date: form.joining_date || undefined,
        gender: form.gender || undefined,
        marital_status: form.marital_status || undefined,
        marriage_date: form.marital_status === "married" && form.marriage_date ? form.marriage_date : undefined,
      };
      const res = await updateMe(payload);
      dispatch(updateUser(res.data));
      toast.success("Profile updated");
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarLoading(true);
    try {
      const res = await removeAvatar();
      dispatch(updateUser(res.data));
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Remove failed");
    } finally {
      setAvatarLoading(false);
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm(blob) {
    setCropSrc(null);
    setAvatarLoading(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const res = await uploadAvatar(file);
      dispatch(updateUser(res.data));
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setAvatarLoading(false);
    }
  }

  const roleLabel = user?.role === "hr" ? "HR/Admin" : (user?.role?.replace(/_/g, " ")?.replace(/\b\w/g, (c) => c.toUpperCase()) || "");
  const roleStyle = ROLE_GRADIENTS[user?.role] || ROLE_GRADIENTS.employee;
  const avatarSrc = user?.profile_image ? `${API_BASE}${user.profile_image}` : null;

  const infoItems = [
    { icon: MdEmail,         label: "Email",          value: user?.email, fullWidth: true },
    { icon: MdPhone,         label: "Phone",          value: user?.phone || "Not set" },
    { icon: MdWork,          label: "Department",     value: user?.department?.name || "Not assigned" },
    { icon: MdCalendarMonth, label: "Joining Date",   value: user?.joining_date || "Not set" },
    { icon: MdCake,          label: "Date of Birth",  value: user?.date_of_birth || "Not set" },
    { icon: MdWc,            label: "Gender",         value: user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : "Not set" },
    { icon: MdFavorite,      label: "Marital Status", value: user?.marital_status ? user.marital_status.charAt(0).toUpperCase() + user.marital_status.slice(1) : "Not set" },
    ...(user?.marital_status === "married" ? [{ icon: MdCalendarMonth, label: "Marriage Date", value: user?.marriage_date || "Not set" }] : []),
    { icon: MdPerson,        label: "Role",           value: roleLabel },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-2xl mx-auto space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-extrabold text-gray-900">My Profile</h1>
        <p className="text-gray-400 text-sm mt-0.5">View and manage your account details</p>
      </motion.div>

      {/* Avatar + name card */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          {/* Avatar with upload overlay */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-16 h-16 bg-gradient-to-br ${roleStyle.gradient} rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold shadow-lg overflow-hidden`}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.[0]?.toUpperCase()
              )}
            </div>
            {/* Camera overlay */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              title="Upload profile photo"
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-60 transition-colors"
            >
              {avatarLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <MdCameraAlt className="text-xs" />
              )}
            </motion.button>
            {/* Remove photo button — only when photo exists */}
            {avatarSrc && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRemoveAvatar}
                disabled={avatarLoading}
                title="Remove profile photo"
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-60 transition-colors"
              >
                <MdDeleteOutline className="text-xs" />
              </motion.button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-gray-900 truncate">{user?.full_name}</h2>
            <p className="text-gray-400 text-sm break-all">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${roleStyle.badge}`}>
                <MdVerified className="text-sm" />
                {roleLabel}
              </span>
              {user?.department?.name && (
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {user.department.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Click the <span className="text-blue-500 font-medium">camera icon</span> to upload a photo — you can crop and adjust before saving
          {avatarSrc && <>, or the <span className="text-red-400 font-medium">red × icon</span> to remove it</>}.
        </p>
      </motion.div>

      <AnimatePresence>
        {cropSrc && (
          <CropModal
            src={cropSrc}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropSrc(null)}
          />
        )}
      </AnimatePresence>

      {/* Personal info */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Personal Information</h3>
          {!editing && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-semibold transition-colors"
            >
              <MdEdit /> Edit Profile
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {infoItems.map((item) => (
            <motion.div key={item.label} whileHover={{ scale: 1.01 }}
              className={`flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl ${item.fullWidth ? "sm:col-span-2" : ""}`}>
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <item.icon className="text-gray-500 text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800" style={{ overflowWrap: "anywhere" }}>{item.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {editing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Edit Information</h4>
              <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MdClose />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Joining Date</label>
                  <input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {["male", "female", "other"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                        form.gender === g
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Marital Status</label>
                <div className="flex gap-2">
                  {["single", "married"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, marital_status: s, marriage_date: s === "single" ? "" : form.marriage_date })}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                        form.marital_status === s
                          ? "border-pink-500 bg-pink-50 text-pink-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {form.marital_status === "married" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Marriage Date</label>
                  <input type="date" value={form.marriage_date} onChange={(e) => setForm({ ...form, marriage_date: e.target.value })} className="input-field" />
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <MdSave /> {loading ? "Saving..." : "Save Changes"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </motion.div>

      {/* Account info */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">Account Information</h3>
        <div className="space-y-0">
          {[
            { label: "Account Status", value: user?.is_active ? "Active" : "Inactive", valueClass: user?.is_active ? "text-green-600 font-semibold" : "text-red-600 font-semibold" },
            {
              label: "Member Since",
              value: user?.created_at
                ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                : "-",
            },
            { label: "Role Level", value: roleLabel },
          ].map((row, i) => (
            <div key={row.label} className={`flex justify-between items-center py-3 ${i < 2 ? "border-b border-gray-50" : ""}`}>
              <span className="text-gray-500 text-sm">{row.label}</span>
              <span className={`text-sm font-medium text-gray-800 ${row.valueClass || ""}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
