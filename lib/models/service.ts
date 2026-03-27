import mongoose, { Schema } from "mongoose"

export interface IService {
  name: string
  description?: string
  category: string
  price: number
  unit?: string
  isAvailable: boolean
  icon?: string
  createdAt?: Date
  updatedAt?: Date
}

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    unit: { type: String, default: "per request" },
    isAvailable: { type: Boolean, default: true },
    icon: { type: String, default: "🛎️" },
  },
  { timestamps: true }
)

if (mongoose.models.Service) {
  delete mongoose.models.Service
}

const Service = mongoose.model<IService>("Service", serviceSchema)
export default Service
