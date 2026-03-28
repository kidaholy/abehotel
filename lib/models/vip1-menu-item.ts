import mongoose, { Schema } from "mongoose"

// Recipe ingredient - defines what stock items are consumed when this VIP 1 item is ordered
interface IRecipeIngredient {
  stockItemId: mongoose.Types.ObjectId
  stockItemName: string
  quantity: number // Fixed property name from previous bug fix
  unit: string
}

interface IVip1MenuItem {
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
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>({
  stockItemId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
  stockItemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true }
})

const vip1MenuItemSchema = new Schema<IVip1MenuItem>(
  {
    menuId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    mainCategory: { type: String, enum: ['Food', 'Drinks'], default: 'Food' },
    category: { type: String, default: 'VIP 1 Special' },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    description: { type: String },
    image: { type: String },
    preparationTime: { type: Number, default: 10 },
    recipe: [RecipeIngredientSchema],
    reportUnit: { type: String, enum: ['kg', 'liter', 'piece'], default: 'piece' },
    reportQuantity: { type: Number, default: 0 },
    distributions: [{ type: String }],
  },
  { timestamps: true }
)

// Method to check if VIP 1 item can be prepared
vip1MenuItemSchema.methods.canBePrepared = async function (quantity: number = 1): Promise<{ available: boolean, missingIngredients: string[] }> {
  const Stock = mongoose.model('Stock')
  const missingIngredients: string[] = []

  for (const ingredient of this.recipe) {
    const stockItem = await Stock.findById(ingredient.stockItemId)
    if (!stockItem || !stockItem.isAvailableForOrder((ingredient.quantity || 0) * quantity)) {
      missingIngredients.push(`${ingredient.stockItemName} (need ${(ingredient.quantity || 0) * quantity} ${ingredient.unit})`)
    }
  }

  return {
    available: missingIngredients.length === 0,
    missingIngredients
  }
}

// Method to consume ingredients when VIP 1 item is ordered
vip1MenuItemSchema.methods.consumeIngredients = async function (quantity: number = 1): Promise<{ success: boolean, errors: string[] }> {
  const Stock = mongoose.model('Stock')
  const errors: string[] = []
  const consumedItems: { item: any, quantity: number }[] = []

  const availability = await this.canBePrepared(quantity)
  if (!availability.available) {
    return {
      success: false,
      errors: [`Cannot prepare VIP 1 ${this.name}: Missing ingredients - ${availability.missingIngredients.join(', ')}`]
    }
  }

  for (const ingredient of this.recipe) {
    const stockItem = await Stock.findById(ingredient.stockItemId)
    if (stockItem) {
      const consumption = (ingredient.quantity || 0) * quantity
      const consumeSuccess = stockItem.consumeStock(consumption)
      if (consumeSuccess) {
        await stockItem.save()
        consumedItems.push({ item: stockItem, quantity: consumption })
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
  delete (mongoose.models as any).Vip1MenuItem
}

const Vip1MenuItem = mongoose.models.Vip1MenuItem || mongoose.model<IVip1MenuItem>("Vip1MenuItem", vip1MenuItemSchema)

export default Vip1MenuItem
