"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { useAuth } from "@/context/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { X, Trash2, ShoppingCart } from "lucide-react"

export interface CartItem {
  id: string
  menuId?: string
  name: string
  price: number
  quantity: number
  category: string
  reportUnit?: string
  distribution?: string  // selected variant label
}

interface CartSidebarProps {
  items: CartItem[]
  onRemove: (id: string) => void
  onQuantityChange: (id: string, quantity: number) => void
  onCheckout: () => void
  onClose?: () => void
  isLoading?: boolean
  isEmbedded?: boolean
  tableNumber: string
  setTableNumber: (val: string) => void
  batchNumber: string
  setBatchNumber: (val: string) => void
  isMeatOnly?: boolean
  isDrinksOnly?: boolean
  isButcherOrder?: boolean
  setIsButcherOrder?: (val: boolean) => void
  isDrinksOrder?: boolean
  setIsDrinksOrder?: (val: boolean) => void
  assignedFloorId?: string
  setSelectedFloorId?: (val: string) => void
  onClear?: () => void
  distribution: string[]
  setDistribution: (val: string[]) => void
}

export function CartSidebar({
  items,
  onRemove,
  onQuantityChange,
  onCheckout,
  onClose,
  isLoading = false,
  isEmbedded = false,
  tableNumber,
  setTableNumber,
  batchNumber,
  setBatchNumber,
  isMeatOnly = false,
  isDrinksOnly = false,
  isButcherOrder = false,
  setIsButcherOrder,
  isDrinksOrder = false,
  setIsDrinksOrder,
  assignedFloorId,
  setSelectedFloorId,
  onClear,
  distribution,
  setDistribution,
}: CartSidebarProps) {
  const { t } = useLanguage()
  const { settings } = useSettings()
  const { token } = useAuth()
  const vatRate = parseFloat(settings.vat_rate || "0.15")
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = total / (1 + vatRate)
  const tax = total - subtotal

  // Settings State for Tables
  const [tables, setTables] = useState<any[]>([])
  const [floors, setFloors] = useState<any[]>([])
  const [activeFloorTab, setActiveFloorTab] = useState<string>("")
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const [distributions, setDistributions] = useState<any[]>([])
  const [isDistModalOpen, setIsDistModalOpen] = useState(false)

  useEffect(() => {
    // Fetch tables and floors
    const fetchData = async () => {
      if (!token) return

      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [tablesRes, floorsRes] = await Promise.all([
          fetch("/api/tables", { headers }),
          fetch("/api/floors", { headers })
        ])

        if (tablesRes.ok) {
          const tData = await tablesRes.json()
          console.log(`📡 Loaded ${tData.length} tables`)
          setTables(tData)
        }
        if (floorsRes.ok) {
          const data = await floorsRes.json()
          console.log(`📡 Loaded ${data.length} floors`)
          setFloors(data)
          // If we have an assignedFloorId, use it as initial tab, otherwise used the first floor
          if (assignedFloorId) {
            setActiveFloorTab(assignedFloorId)
          } else if (data.length > 0) {
            setActiveFloorTab(data[0]._id)
          }
        }
      } catch (err) { console.error("Failed to load data", err) }
    }
    fetchData()

    const fetchDistributions = async () => {
      if (!token) return
      try {
        const res = await fetch("/api/categories?type=distribution", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDistributions(data)
        }
      } catch (err) { console.error("Failed to load distributions", err) }
    }
    fetchDistributions()
  }, [token, assignedFloorId])


  // Helper to get floor name for selected context
  const getSelectedFloorDisplay = () => {
    const bId = assignedFloorId || activeFloorTab;
    if (!bId) return "";
    const floor = floors.find(b => String(b._id) === String(bId))
    return floor ? `Floor #${floor.floorNumber}` : ""
  }

  const containerClasses = isEmbedded
    ? "w-full flex flex-col h-full bg-transparent"
    : "w-full md:w-[400px] bg-[#151716] border-l border-white/5 flex flex-col md:h-screen md:sticky md:right-0 md:top-0 shadow-2xl"

  return (
    <div className={containerClasses}>
      {/* Unified Header */}
      <div className={`p-4 border-b border-white/5 bg-[#0f1110]/50 flex justify-between items-center ${isEmbedded ? 'rounded-t-[32px]' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2d5a41]/10 flex items-center justify-center text-[#2d5a41]">
            <ShoppingCart size={18} />
          </div>
          <div>
            <h2 className="text-lg font-playfair italic font-bold text-white tracking-tight">{t("cashier.orderCart")}</h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{items.length} {t("cashier.items")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Clear Cart"
            >
              <Trash2 size={18} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 hover:bg-white/5 rounded-full transition-colors text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Unified Compact Metadata */}
      <div className={`${isEmbedded ? 'pb-3' : 'px-4 pb-3'} space-y-2 mt-3`}>
        {/* Toggle Row */}
        {(setIsButcherOrder || setIsDrinksOrder) && (
          <div className="flex gap-2">
            {setIsButcherOrder && (
              <button
                onClick={() => {
                  const newValue = !isButcherOrder;
                  setIsButcherOrder(newValue);
                  if (newValue) {
                    setTableNumber("");
                    if (setIsDrinksOrder) setIsDrinksOrder(false);
                  }
                }}
                className={`flex-1 p-2 rounded-xl flex items-center justify-center gap-2 transition-all border ${isButcherOrder
                  ? "bg-[#8B4513]/20 border-[#8B4513] text-[#f3cf7a] shadow-lg"
                  : "bg-[#0f1110] border-white/5 text-gray-500 hover:border-white/10"
                  }`}
              >
                <span className="text-[11px] font-black uppercase tracking-tight">🥩 Butcher</span>
                {isButcherOrder && <span className="w-1.5 h-1.5 rounded-full bg-[#8B4513] animate-pulse"></span>}
              </button>
            )}
            {setIsDrinksOrder && (
              <button
                onClick={() => {
                  const newValue = !isDrinksOrder;
                  setIsDrinksOrder(newValue);
                  if (newValue) {
                    setTableNumber("");
                    if (setIsButcherOrder) setIsButcherOrder(false);
                  }
                }}
                className={`flex-1 p-2 rounded-xl flex items-center justify-center gap-2 transition-all border ${isDrinksOrder
                  ? "bg-amber-900/20 border-amber-500 text-[#f3cf7a] shadow-lg"
                  : "bg-[#0f1110] border-white/5 text-gray-500 hover:border-white/10"
                  }`}
              >
                <span className="text-[11px] font-black uppercase tracking-tight">🥤 Drinks</span>
                {isDrinksOrder && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
              </button>
            )}
          </div>
        )}

        {!isButcherOrder && !isDrinksOrder && (
          <div className="flex items-center gap-2">
            <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
              <DialogTrigger asChild>
                <button className="flex-1 bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold flex justify-between items-center hover:border-[#2d5a41] hover:bg-[#2d5a41]/5 transition-all outline-none">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold">🪑</span>
                    <span className={tableNumber ? "text-white font-bold" : "text-gray-500 font-bold"}>
                      {tableNumber ? `Table ${tableNumber}` : "Select Table"}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500">▼</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-6 bg-[#151716] border-white/5 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">Select Table</DialogTitle>
                </DialogHeader>
                <Tabs value={activeFloorTab} onValueChange={setActiveFloorTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="bg-[#0f1110] p-1.5 rounded-xl flex flex-wrap justify-start gap-1.5 mb-6 border border-white/5 w-fit">
                    {floors.map(floor => (
                      <TabsTrigger
                        key={floor._id}
                        value={floor._id}
                        className="px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all 
                          data-[state=active]:bg-[#d4af37] data-[state=active]:text-[#0f1110] data-[state=active]:shadow-lg
                          data-[state=inactive]:text-gray-400 data-[state=inactive]:bg-white/5 hover:bg-white/10"
                      >
                        Floor #{floor.floorNumber}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="flex-1 overflow-y-auto pr-1">
                    {floors.map(floor => (
                      <TabsContent key={floor._id} value={floor._id} className="mt-0">
                        <div className="grid grid-cols-4 gap-2">
                          {tables.map(table => (
                            <button
                              key={table._id}
                              onClick={() => {
                                setTableNumber(table.tableNumber)
                                if (setSelectedFloorId) setSelectedFloorId(floor._id)
                                setIsTableModalOpen(false)
                              }}
                              className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${tableNumber === table.tableNumber && assignedFloorId === floor._id
                                ? "bg-[#2d5a41] border-[#2d5a41] text-white shadow-md scale-105"
                                : "bg-[#0f1110] border-white/5 hover:border-[#2d5a41] text-gray-400"
                                }`}
                            >
                              <span className="text-sm font-black">{table.tableNumber}</span>
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>

            <Dialog open={isDistModalOpen} onOpenChange={setIsDistModalOpen}>
              <DialogTrigger asChild>
                <button className="flex-1 bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold flex justify-between items-center hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all outline-none">
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <span className="text-gray-500 font-bold">🚚</span>
                    <span className={distribution.length > 0 ? "text-white font-bold truncate" : "text-gray-500 font-bold"}>
                      {distribution.length > 0 ? distribution.join(", ") : "Distribution"}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500">▼</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-[#151716] border-white/5 text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-playfair italic font-bold text-[#f3cf7a]">Select Distribution</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {distributions.map(dist => (
                    <button
                      key={dist._id}
                      onClick={() => {
                        const current = distribution || []
                        const updated = current.includes(dist.name)
                          ? current.filter(d => d !== dist.name)
                          : [...current, dist.name]
                        setDistribution(updated)
                      }}
                      className={`p-4 rounded-xl border font-bold transition-all ${distribution.includes(dist.name)
                        ? "bg-[#2d5a41] border-[#2d5a41] text-white shadow-lg scale-105"
                        : "bg-[#0f1110] border-white/5 hover:border-[#2d5a41] text-gray-400"
                        }`}
                    >
                      {dist.name}
                    </button>
                  ))}
                  {distributions.length === 0 && (
                    <p className="col-span-2 text-center py-6 text-gray-500 text-xs italic">No distributions found. Add them in Admin Settings.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 hover:border-[#d4af37]/30 transition-all">
            <span className="text-gray-500 font-bold">🏷️</span>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Batch Number"
              className="w-full bg-transparent outline-none text-white placeholder:text-gray-500 font-bold text-xs"
            />
          </div>
        </div>

        {isButcherOrder && (
          <div className="bg-[#8B4513]/10 border border-dashed border-[#8B4513]/30 rounded-xl py-3 px-4 text-center">
            <p className="text-[#f3cf7a] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B4513] animate-pulse"></span>
              Meat Buy & Go Mode
            </p>
          </div>
        )}

        {isDrinksOrder && (
          <div className="bg-amber-900/10 border border-dashed border-amber-500/30 rounded-xl py-3 px-4 text-center">
            <p className="text-[#f3cf7a] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Drinks To Go Mode
            </p>
          </div>
        )}
      </div>

      {/* Items - Mobile Optimized Table View */}
      <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'py-2' : 'p-4'} custom-scrollbar`}>
        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4 opacity-20">🛒</div>
            <p className="font-bold">{t("cashier.cartEmpty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Headers for table-like view */}
            <div className="px-4 py-2 flex text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-2">
              <span className="flex-1">Item</span>
              <span className="w-24 text-center">Quantity</span>
              <span className="w-20 text-right">Price</span>
            </div>

            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#0f1110] hover:bg-[#1a1c1b] rounded-2xl p-4 flex items-center gap-4 border border-white/5 hover:border-[#d4af37]/30 transition-all group animate-slide-in-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.menuId && <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded border border-gray-100 text-gray-500">#{item.menuId}</span>}
                    <h3 className="font-playfair italic font-bold text-sm text-white tracking-tight leading-none truncate">
                      {item.name}
                    </h3>
                  </div>
                  {item.distribution && (
                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 w-fit px-1.5 py-0.5 rounded italic">{item.distribution}</p>
                  )}
                  <p className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-widest">{item.price} {t("common.currencyBr")}</p>
                </div>

                <div className="flex items-center bg-[#151716] rounded-full p-1 gap-1.5 shadow-xl border border-white/5">
                  <button
                    onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 bg-[#0f1110] shadow-sm rounded-full flex items-center justify-center text-xs hover:bg-red-900/20 hover:text-red-500 transition-all font-black text-gray-500 border border-white/5 shrink-0"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-black text-sm text-white">{item.quantity}</span>
                  <button
                    onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                    className="w-8 h-8 bg-[#d4af37] text-[#0f1110] shadow-md rounded-full flex items-center justify-center text-xs hover:scale-110 transition-all font-black shrink-0"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pr-1 min-w-[80px]">
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">Total</p>
                    <span className="text-sm font-black text-[#f3cf7a] tracking-tight">{(item.price * item.quantity).toFixed(0)} <span className="text-[10px]">{t("common.currencyBr")}</span></span>
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-2 -mr-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all flex items-center justify-center shrink-0"
                    title="Remove item"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className={`p-4 border-t border-white/5 bg-[#0f1110]/50 space-y-3`}>
        <div className="space-y-3 bg-[#151716] p-5 rounded-3xl border border-white/5 shadow-2xl">
          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="font-black text-gray-400 uppercase tracking-widest text-xs">{t("cashier.total")}</span>
            <div className="text-right">
              <span className="text-3xl font-playfair font-bold text-[#f3cf7a] tracking-tight">{total.toFixed(0)}</span>
              <span className="text-xs text-[#f3cf7a] ml-1 font-bold italic">{t("common.currencyBr")}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0 || isLoading}
          className="w-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] font-black py-4 rounded-2xl shadow-xl hover:shadow-[#d4af37]/20 transition-all transform hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin text-xl">⏳</span>
              {t("cashier.processing")}
            </>
          ) : (
            <>
              <span className="text-xl">🚀</span>
              <span className="uppercase tracking-widest text-sm">{t("cashier.sendToKitchen")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
