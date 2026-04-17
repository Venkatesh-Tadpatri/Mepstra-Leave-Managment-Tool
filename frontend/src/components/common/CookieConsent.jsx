import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdCookie, MdShield, MdAnalytics, MdCheckCircle } from "react-icons/md";

const SESSION_KEY = "mepstra_cookie_session";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show on every new session (hard refresh, new tab, new system)
    const sessionConsent = sessionStorage.getItem(SESSION_KEY);
    if (!sessionConsent) setVisible(true);
  }, []);

  function handleAccept(choice) {
    sessionStorage.setItem(SESSION_KEY, choice);
    localStorage.setItem("mepstra_cookie_consent", choice);
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop — blocks all interaction beneath */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-6 z-[101] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/30 border border-white/80">

              {/* Header */}
              <div
                className="px-6 pt-5 pb-4 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0f3460 0%, #0d9488 60%, #059669 100%)" }}
              >
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute -bottom-3 -left-3 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <MdCookie className="text-white text-2xl" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200">Mepstra · Cookie Notice</p>
                    <h3 className="text-base font-extrabold text-white leading-tight">We value your privacy</h3>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white px-6 py-4">
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  We use cookies to keep your session secure and the portal working properly.
                  You can also allow analytics cookies to help us improve performance.
                </p>

                {/* Cookie types */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-50 border border-teal-100">
                    <MdShield className="text-teal-600 text-lg mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-teal-800">Essential Cookies <span className="ml-1 text-[10px] font-semibold bg-teal-600 text-white px-1.5 py-0.5 rounded-full">Always On</span></p>
                      <p className="text-xs text-teal-700 mt-0.5">Authentication, session security, and core functionality.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <MdAnalytics className="text-gray-400 text-lg mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-700">Analytics Cookies <span className="ml-1 text-[10px] font-semibold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">Optional</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">Help us understand usage to improve the portal.</p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept("essential")}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                  >
                    Essential Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccept("accepted")}
                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-105"
                    style={{ background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)", boxShadow: "0 4px 16px rgba(13,148,136,0.35)" }}
                  >
                    <MdCheckCircle className="text-base" />
                    Accept All Cookies
                  </button>
                </div>

                <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
                  By using Mepstra Leave Portal you agree to our cookie policy.
                  Your preference is saved for this session.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
