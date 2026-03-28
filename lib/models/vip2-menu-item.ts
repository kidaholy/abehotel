import mongoose, { Schema } from "mongoose"

interface IRecipeIngredient {
  stockItemId: mongoose.Types.ObjectId
  stockItemName: string
  quantity: number
  unit: string
}

interface IVip2MenuItem {
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
  stockItemId?: mongoose.Types.ObjectId | null
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>({
  stockItemId: { type: Schema.Types.ObjectId, ref: "Stock", required: true },
  stockItemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true }
})

const vip2MenuItemSchema = new Schema<IVip2MenuItem>(
  {
    menuId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    mainCategory: { type: String, enum: ['Food', 'Drinks'], default: 'Food' },
    category: { type: String, default: 'VIP 2 Special' },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    description: { type: String },
    image: { type: String },
    preparationTime: { type: Number, default: 10 },
    recipe: [RecipeIngredientSchema],
    reportUnit: { type: String, enum: ['kg', 'liter', 'piece'], default: 'piece' },
    reportQuantity: { type: Number, default: 0 },
    distributions: [{ type: String }],
    stockItemId: { type: Schema.Types.ObjectId, ref: "Stock", default: null }
  },
  // Explicitly bind to the vip2menuitems collection in MongoDB Atlas
  { timestamps: true, collection: 'vip2menuitems' }
)

// Never delete this model in development — it causes collection mapping to reset
const Vip2MenuItem = mongoose.models.Vip2MenuItem || mongoose.model<IVip2MenuItem>("Vip2MenuItem", vip2MenuItemSchema)

export default Vip2MenuItem
