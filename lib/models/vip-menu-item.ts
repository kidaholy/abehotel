import mongoose, { Schema } from "mongoose"

// Recipe ingredient - defines what stock items are consumed when this VIP item is ordered
interface IRecipeIngredient {
  stockItemId: mongoose.Types.ObjectId
  stockItemName: string
  quantityRequired: number
  unit: string
}

interface IVipMenuItem {
  menuId: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: number
  available: boolean
  description?: string
  image?: string
  preparationTime?: number
  recipe: IRecipeIngredient[]
  reportUnit?: 'kg' | 'liter' | 'piece'
  reportQuantity?: number
  distributions?: string[]
  vipLevel: 1 | 2
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>({
  stockItemId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
  stockItemName: { type: String, required: true },
  quantityRequired: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true }
})

const vipMenuItemSchema = new Schema<IVipMenuItem>(
  {
    menuId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    mainCategory: { type: String, enum: ['Food', 'Drinks'], default: 'Food' },
    category: { type: String, default: 'VIP Special' },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    description: { type: String },
    image: { type: String },
    preparationTime: { type: Number, default: 10 },
    recipe: [RecipeIngredientSchema],
    reportUnit: { type: String, enum: ['kg', 'liter', 'piece'], default: 'piece' },
    reportQuantity: { type: Number, default: 0 },
    distributions: [{ type: String }],
    vipLevel: { type: Number, enum: [1, 2], default: 1 },
  },
  { timestamps: true }
)

// Method to check if VIP item can be prepared
vipMenuItemSchema.methods.canBePrepared = async function (quantity: number = 1): Promise<{ available: boolean, missingIngredients: string[] }> {
  const Stock = mongoose.model('Stock')
  const missingIngredients: string[] = []

  for (const ingredient of this.recipe) {
    const stockItem = await Stock.findById(ingredient.stockItemId)
    if (!stockItem || !stockItem.isAvailableForOrder(ingredient.quantityRequired * quantity)) {
      missingIngredients.push(`${ingredient.stockItemName} (need ${ingredient.quantityRequired * quantity} ${ingredient.unit})`)
    }
  }

  return {
    available: missingIngredients.length === 0,
    missingIngredients
  }
}

// Method to consume ingredients when VIP item is ordered
vipMenuItemSchema.methods.consumeIngredients = async function (quantity: number = 1): Promise<{ success: boolean, errors: string[] }> {
  const Stock = mongoose.model('Stock')
  const errors: string[] = []
  const consumedItems: { item: any, quantity: number }[] = []

  const availability = await this.canBePrepared(quantity)
  if (!availability.available) {
    return {
      success: false,
      errors: [`Cannot prepare VIP ${this.name}: Missing ingredients - ${availability.missingIngredients.join(', ')}`]
    }
  }

  for (const ingredient of this.recipe) {
    const stockItem = await Stock.findById(ingredient.stockItemId)
    if (stockItem) {
      const consumeSuccess = stockItem.consumeStock(ingredient.quantityRequired * quantity)
      if (consumeSuccess) {
        await stockItem.save()
        consumedItems.push({ item: stockItem, quantity: ingredient.quantityRequired * quantity })
      } else {
        for (const consumed of consumedItems) {
          consumed.item.quantity += consumed.quantity
          consumed.item.totalConsumed -= consumed.quantity
          await consumed.item.save()
        }
        errors.push(`Failed to consume ${ingredient.stockItemName}`)
        break
      }
    } else {
      errors.push(`Stock item ${ingredient.stockItemName} not found`)
    }
  }

  return {
    success: errors.length === 0,
    errors
  }
}

// Force model re-registration to pick up schema changes in development
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.VipMenuItem
}

const VipMenuItem = mongoose.models.VipMenuItem || mongoose.model<IVipMenuItem>("VipMenuItem", vipMenuItemSchema)

export default VipMenuItem
