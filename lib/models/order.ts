import mongoose, { Schema, Document } from "mongoose"

interface IOrderItem {
  menuItemId: string
  menuId?: string
  name: string
  quantity: number
  price: number
  status: "unconfirmed" | "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled"
  modifiers?: string[]
  notes?: string
  category?: string
  mainCategory?: 'Food' | 'Drinks'
  menuTier?: 'standard' | 'vip1' | 'vip2'
  initialStatus?: string
  preparationTime?: number
}

interface IOrder extends Document {
  orderNumber: string
  items: IOrderItem[]
  totalAmount: number
  tax?: number
  subtotal?: number
  status: "unconfirmed" | "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled"
  paymentMethod: string
  customerName?: string
  tableNumber: string
  batchNumber?: string
  tableId?: mongoose.Types.ObjectId | string
  floorId?: mongoose.Types.ObjectId | string
  floorNumber?: string
  distributions?: string[]
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
  kitchenAcceptedAt?: Date
  readyAt?: Date
  servedAt?: Date
  delayMinutes?: number
  thresholdMinutes?: number
  totalPreparationTime?: number
  isDeleted?: boolean
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    items: [
      {
        menuItemId: { type: String, required: true },
        menuId: { type: String },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        status: {
          type: String,
          enum: ["unconfirmed", "pending", "preparing", "ready", "served", "completed", "cancelled"],
          default: "pending"
        },
        modifiers: [{ type: String }],
        notes: { type: String },
        category: { type: String },
        mainCategory: { type: String, enum: ['Food', 'Drinks'] },
        menuTier: { type: String, enum: ['standard', 'vip1', 'vip2'], default: 'standard' },
        initialStatus: { type: String },
        preparationTime: { type: Number }
      },
    ],
    totalAmount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["unconfirmed", "pending", "preparing", "ready", "served", "completed", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "cash" },
    customerName: { type: String },
    tableNumber: { type: String, required: true, index: true },
    batchNumber: { type: String, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: "Table" },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor" },
    floorNumber: { type: String },
    distributions: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    kitchenAcceptedAt: { type: Date },
    readyAt: { type: Date },
    servedAt: { type: Date },
    delayMinutes: { type: Number },
    thresholdMinutes: { type: Number },
    totalPreparationTime: { type: Number },
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
)

// Performance Indexes
orderSchema.index({ status: 1, createdAt: -1 })
orderSchema.index({ floorId: 1 })
orderSchema.index({ "items.category": 1 })
orderSchema.index({ createdBy: 1 })
orderSchema.index({ createdAt: -1 })

if (mongoose.models.Order) {
  delete mongoose.models.Order
}
const Order = mongoose.model<IOrder>("Order", orderSchema)

export default Order
