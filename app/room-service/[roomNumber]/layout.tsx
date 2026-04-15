export default function RoomServiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0f1110] text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
      {children}
    </div>
  )
}
