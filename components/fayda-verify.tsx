"use client"

import { useState, useEffect, useRef } from "react"
import { ShieldCheck, Loader2, CheckCircle2, X, User, Phone, Calendar, IdCard, ExternalLink, RefreshCw } from "lucide-react"

export interface FaydaResult {
  fullName: string
  dob: string
  gender: string
  phone: string
  nationality: string
  photo: string
}

interface FaydaVerifyProps {
  onVerified: (result: FaydaResult) => void
  onClose: () => void
  token: string
}

type Stage = "idle" | "launching" | "waiting" | "done" | "error"

export function FaydaVerify({ onVerified, onClose, token }: FaydaVerifyProps) {
  const [stage, setStage] = useState<Stage>("idle")
  const [error, setError] = useState("")
  const [identity, setIdentity] = useState<FaydaResult | null>(null)
  const [countdown, setCountdown] = useState(0)
  const resultsKeyRef = useRef<string>("")
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const popupRef = useRef<Window | null>(null)

  // Countdown display
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const startVerification = async () => {
    setError("")
    setStage("launching")

    try {
      // Build redirect URL back to this page
      const redirectUrl = `${window.location.origin}/fayda-callback`

      const res = await fetch("/api/fayda/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ redirectUrl }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to start verification")
      }

      const { launchUrl, resultsAccessKey } = await res.json()
      resultsKeyRef.current = resultsAccessKey

      // Open Fayda verification in a popup
      const popup = window.open(launchUrl, "fayda-verify",
        "width=500,height=700,left=200,top=100,resizable=yes,scrollbars=yes"
      )
      popupRef.current = popup
      setStage("waiting")
      setCountdown(300) // 5 min timeout

      // Poll for results every 3 seconds
      pollRef.current = setInterval(async () => {
        await pollResult()
      }, 3000)

    } catch (err: any) {
      setError(err.message || "Failed to start verification")
      setStage("error")
    }
  }

  const pollResult = async () => {
    if (!resultsKeyRef.current) return
    try {
      const res = await fetch("/api/fayda/get-result", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resultsAccessKey: resultsKeyRef.current }),
      })

      if (!res.ok) return

      const data = await res.json()

      if (data.done) {
        if (pollRef.current) clearInterval(pollRef.current)
        popupRef.current?.close()

        if (data.success && data.identity) {
          setIdentity(data.identity)
          setStage("done")
        } else {
          setError(data.message || "Verification failed or was cancelled")
          setStage("error")
        }
      }
    } catch { /* silent — keep polling */ }
  }

  const handleConfirm = () => {
    if (identity) onVerified(identity)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#d4af37]/10 rounded-lg border border-[#d4af37]/20">
              <ShieldCheck size={18} className="text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Fayda ID Verification</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                Powered by Trinsic · Ethiopia NIDP
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-[#0f1110] border border-white/10 rounded-xl flex items-center justify-center text-white hover:text-red-400 hover:border-red-500/30 transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── IDLE: Start ── */}
          {stage === "idle" && (
            <>
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <IdCard size={36} className="text-[#d4af37]" />
                </div>
                <h3 className="text-white font-black text-lg mb-2">Verify Guest Identity</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  This will open a secure Fayda verification window. The guest will enter their FAN number and confirm with an OTP sent to their registered phone.
                </p>
              </div>

              <div className="bg-[#0f1110] rounded-xl p-4 border border-white/5 space-y-2">
                {[
                  "Guest enters their 12-digit FAN number",
                  "Fayda sends OTP to their registered phone",
                  "Guest confirms OTP to share their identity",
                  "Verified name, DOB and photo returned here",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-[#d4af37]/20 text-[#f3cf7a] rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-gray-400 text-xs">{step}</p>
                  </div>
                ))}
              </div>

              <button onClick={startVerification}
                className="w-full bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2">
                <ExternalLink size={14} /> Start Fayda Verification
              </button>
            </>
          )}

          {/* ── LAUNCHING ── */}
          {stage === "launching" && (
            <div className="text-center py-10">
              <Loader2 size={40} className="animate-spin text-[#d4af37] mx-auto mb-4" />
              <p className="text-white font-black">Opening Fayda…</p>
              <p className="text-gray-500 text-xs mt-1">Creating secure verification session</p>
            </div>
          )}

          {/* ── WAITING for guest to complete ── */}
          {stage === "waiting" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-blue-900/30 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <RefreshCw size={28} className="text-blue-400 animate-spin" />
              </div>
              <div>
                <p className="text-white font-black text-lg">Waiting for Guest</p>
                <p className="text-gray-400 text-sm mt-1">Ask the guest to complete verification in the popup window.</p>
              </div>
              <div className="bg-[#0f1110] rounded-xl p-4 border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Session expires in</p>
                <p className="text-2xl font-black text-[#f3cf7a]">
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { popupRef.current?.focus() }}
                  className="flex-1 py-2.5 bg-[#0f1110] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center justify-center gap-1.5">
                  <ExternalLink size={12} /> Reopen Window
                </button>
                <button onClick={pollResult}
                  className="flex-1 py-2.5 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#f3cf7a] hover:bg-[#d4af37]/20 transition-all flex items-center justify-center gap-1.5">
                  <RefreshCw size={12} /> Check Now
                </button>
              </div>
            </div>
          )}

          {/* ── DONE: Show verified identity ── */}
          {stage === "done" && identity && (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {identity.photo ? (
                    <img src={identity.photo} alt={identity.fullName}
                      className="w-24 h-24 rounded-2xl border-2 border-[#d4af37]/40 object-cover bg-[#0f1110]" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl border-2 border-[#d4af37]/40 bg-[#0f1110] flex items-center justify-center">
                      <User size={36} className="text-[#d4af37]" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#151716]">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Identity Verified by Fayda</p>
                  <h3 className="text-xl font-playfair italic font-bold text-white">{identity.fullName}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <User size={12} />,     label: "Gender",       value: identity.gender },
                  { icon: <Calendar size={12} />, label: "Date of Birth", value: identity.dob },
                  { icon: <Phone size={12} />,    label: "Phone",        value: identity.phone },
                  { icon: <IdCard size={12} />,   label: "Nationality",  value: identity.nationality },
                ].filter(f => f.value).map(({ icon, label, value }) => (
                  <div key={label} className="bg-[#0f1110] rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 text-gray-500 mb-1">{icon}<span className="text-[9px] font-black uppercase tracking-widest">{label}</span></div>
                    <p className="text-white text-xs font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <button onClick={handleConfirm}
                className="w-full bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={14} /> Use This Identity
              </button>
            </>
          )}

          {/* ── ERROR ── */}
          {stage === "error" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-red-900/30 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <X size={28} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-black text-lg">Verification Failed</p>
                <p className="text-red-400 text-sm mt-1">{error}</p>
              </div>
              <button onClick={() => { setStage("idle"); setError("") }}
                className="w-full py-3 bg-[#0f1110] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
