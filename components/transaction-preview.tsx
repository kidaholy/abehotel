"use client"

import { FileText, Link2 } from "lucide-react"

export function TransactionPreview({ url }: { url: string }) {
  const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(url)}`
  const filename = url.split("/").pop()?.split("?")[0] || "receipt.pdf"
  const isPdf = url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("receipt")

  return (
    <a href={proxyUrl} target="_blank" rel="noreferrer"
      className="flex items-center gap-3 bg-[#1a1c1b] border border-white/10 rounded-xl px-4 py-3 hover:border-blue-500/30 hover:bg-blue-900/10 transition-all group">
      <div className="w-10 h-10 bg-blue-900/40 border border-blue-500/30 rounded-xl flex items-center justify-center shrink-0">
        <FileText size={20} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-black truncate group-hover:text-blue-300 transition-colors">{filename}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{isPdf ? "PDF Document" : "File"} · Click to open</p>
      </div>
      <Link2 size={14} className="text-gray-600 group-hover:text-blue-400 transition-colors shrink-0" />
    </a>
  )
}
