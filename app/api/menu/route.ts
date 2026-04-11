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
    await validateSession(request)

    const { searchParams } = new URL(request.url)
    const menuType = searchParams.get('type') || 'all' // 'standard', 'vip1', 'vip2', 'all'

    try {
      await connectDB()
    } catch (dbError: any) {
      // Database unreachable - return empty menu with 200 status
      console.warn("⚠️ Menu - DB unreachable, returning empty menu")
      return NextResponse.json([], {
        headers: {
          'X-Menu-Count': '0',
          'X-VIP1-Count': '0',
          'X-VIP2-Count': '0',
          'X-Standard-Count': '0',
        }
      })
    }

    // Ensure Stock model is registered
    void Stock.modelName

    let allItems: any[] = []

    // Fetch all available items from each collection
    if (menuType === 'standard' || menuType === 'all') {
      const standardItems = await (MenuItem as any).find({ available: { $ne: false } })
        .populate('stockItemId')
        .populate('recipe.stockItemId')
        .lean()

      // STRICT SEPARATION: Filter out VIP items from the standard collection
      const filteredStandard = standardItems.filter((item: any) => {
        const isVipCat = item.category && item.category.toLowerCase().includes('vip');
        const isVipName = item.name && item.name.toLowerCase().includes('vip');
        return !isVipCat && !isVipName && item.isVIP !== true;
      });

      allItems = [...allItems, ...filteredStandard.map((i: any) => ({ ...i, menuType: 'standard' }))]
    }

    if (menuType === 'vip1' || menuType === 'all') {
      const vip1Items = await (Vip1MenuItem as any).find({ available: { $ne: false } })
        .populate('stockItemId')
        .populate('recipe.stockItemId')
        .lean()
      allItems = [...allItems, ...vip1Items.map((i: any) => ({ ...i, menuType: 'vip1' }))]
    }

    if (menuType === 'vip2' || menuType === 'all') {
      const vip2Items = await (Vip2MenuItem as any).find({ available: { $ne: false } })
        .populate('stockItemId')
        .populate('recipe.stockItemId')
        .lean()
      allItems = [...allItems, ...vip2Items.map((i: any) => ({ ...i, menuType: 'vip2' }))]
    }

    // Filter out items linked to permanently finished stock
    const filteredItems = allItems.filter((item: any) => {
      if (item.stockItemId && typeof item.stockItemId === 'object') {
        const stock = item.stockItemId
        if (stock.trackQuantity !== false && stock.status === 'finished') return false
      }

      if (item.recipe && item.recipe.length > 0) {
        for (const ingredient of item.recipe) {
          const stock = ingredient.stockItemId
          if (stock && typeof stock === 'object') {
            if (stock.trackQuantity !== false && stock.status === 'finished') return false
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

    return NextResponse.json(serializedItems, {
      headers: {
        'X-Menu-Count': serializedItems.length.toString(),
        'X-VIP1-Count': serializedItems.filter((i: any) => i.menuType === 'vip1').length.toString(),
        'X-VIP2-Count': serializedItems.filter((i: any) => i.menuType === 'vip2').length.toString(),
        'X-Standard-Count': serializedItems.filter((i: any) => i.menuType === 'standard').length.toString(),
      }
    })
  } catch (error: any) {
    console.error("Get menu error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to get menu" }, { status })
  }
}
