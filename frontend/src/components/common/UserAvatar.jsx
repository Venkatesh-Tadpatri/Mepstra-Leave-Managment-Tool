const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:8000";

const SIZE_CLASSES = {
  xs:  "w-6 h-6 text-[10px]",
  sm:  "w-8 h-8 text-xs",
  md:  "w-10 h-10 text-sm",
  lg:  "w-11 h-11 text-sm",
  xl:  "w-12 h-12 text-sm",
};

const GRADIENTS = [
  "from-blue-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-yellow-600",
  "from-indigo-500 to-blue-600",
];

function gradientFor(name = "") {
  const code = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return GRADIENTS[code % GRADIENTS.length];
}

export default function UserAvatar({ name = "", profileImage = null, size = "md", className = "", rounded = "xl" }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-xl";
  const gradient = gradientFor(name);

  if (profileImage) {
    const src = profileImage.startsWith("http") ? profileImage : `${BASE}${profileImage}`;
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} ${roundedClass} object-cover shadow-sm flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} ${roundedClass} bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm ${className}`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}
