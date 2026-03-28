import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import Vip2MenuItem from "@/lib/models/vip2-menu-item"
import Stock from "@/lib/models/stock"
import { validateSession } from "@/lib/auth"

// Public menu API - fetches from each collection independently
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)

    const { searchParams } = new URL(request.url)
    const fetchAll = searchParams.get('all') === 'true'
    const menuType = searchParams.get('type') || 'all' // 'standard', 'vip1', 'vip2', 'all'

    await connectDB()
    // Ensure Stock model is registered
    void Stock.modelName

    const availabilityQuery = fetchAll ? {} : { available: true }

    let allItems: any[] = []

    // Fetch ONLY from the requested collection(s)
    if (menuType === 'standard' || menuType === 'all') {
      const standardItems = await (MenuItem as any).find(availabilityQuery)
        .populate('stockItemId')
        .populate('recipe.stockItemId')
        .lean()
      allItems = [...allItems, ...standardItems.map((i: any) => ({ ...i, menuType: 'standard' }))]
    }

    if (menuType === 'vip1' || menuType === 'all') {
      const vip1Items = await (Vip1MenuItem as any).find(availabilityQuery)
        .populate('recipe.stockItemId')
        .lean()
      allItems = [...allItems, ...vip1Items.map((i: any) => ({ ...i, menuType: 'vip1' }))]
    }

    if (menuType === 'vip2' || menuType === 'all') {
      const vip2Items = await (Vip2MenuItem as any).find(availabilityQuery)
        .populate('recipe.stockItemId')
        .lean()
      allItems = [...allItems, ...vip2Items.map((i: any) => ({ ...i, menuType: 'vip2' }))]
    }

    // Filter out items where stock is depleted
    const filteredItems = allItems.filter((item: any) => {
      if (fetchAll) return true

      if (item.stockItemId && typeof item.stockItemId === 'object') {
        const status = item.stockItemId.status
        const qty = item.stockItemId.quantity || 0
        if (status === 'finished' || status === 'out_of_stock' || qty <= 0) return false
      }

      if (item.recipe && item.recipe.length > 0) {
        for (const ingredient of item.recipe) {
          const stock = ingredient.stockItemId
          if (stock && typeof stock === 'object') {
            const required = ingredient.quantity || ingredient.quantityRequired || 0
            if (stock.status === 'finished' || stock.status === 'out_of_stock' || (stock.quantity || 0) < required) {
              return false
            }
          }
        }
      }

      return true
    })

    const serializedItems = filteredItems.map((item: any) => ({
      ...item,
      _id: item._id.toString(),
      stockItemId: item.stockItemId
        ? (typeof item.stockItemId === 'object' && '_id' in item.stockItemId
          ? item.stockItemId._id.toString()
          : item.stockItemId.toString())
        : null
    })).sort((a: any, b: any) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json(serializedItems)
  } catch (error: any) {
    console.error("Get menu error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to get menu" }, { status })
  }
}
