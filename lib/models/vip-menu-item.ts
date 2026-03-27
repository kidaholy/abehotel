import mongoose, { Schema } from "mongoose"

interface IVipMenuItem {
  name: string
  category: string
  price: number
  available: boolean
  description?: string
  image?: string
}

const vipMenuItemSchema = new Schema<IVipMenuItem>(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'VIP Special' },
    price: { type: Number, required: true },
    available: { type: Boolean, default: true },
    description: { type: String },
    image: { type: String },
  },
  { timestamps: true }
)

// Force model re-registration to pick up schema changes in development
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.VipMenuItem
}

const VipMenuItem = mongoose.models.VipMenuItem || mongoose.model<IVipMenuItem>("VipMenuItem", vipMenuItemSchema)

export default VipMenuItem
