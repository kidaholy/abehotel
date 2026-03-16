import mongoose, { Schema, Document } from "mongoose"

export interface IBatch extends Document {
  batchNumber: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const BatchSchema = new Schema<IBatch>(
  {
    batchNumber: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Batch = mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema)

export default Batch
