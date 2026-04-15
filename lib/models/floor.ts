import mongoose, { Schema, Document } from "mongoose"

export interface IFloor extends Document {
    floorNumber: string
    description?: string
    order: number
    isActive: boolean
    isVIP: boolean
    type: 'standard' | 'vip'
    status?: string
    roomServiceCashierId?: mongoose.Types.ObjectId | string
    createdAt: Date
    updatedAt: Date
}

const FloorSchema = new Schema<IFloor>(
    {
        floorNumber: { type: String, required: true, trim: true, unique: true },
        description: { type: String },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        isVIP: { type: Boolean, default: false },
        type: { type: String, enum: ['standard', 'vip'], default: 'standard' },
        status: { type: String, default: "active" },
        roomServiceCashierId: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
)

// Force model re-registration to clear any ghost schemas
if (mongoose.models.Floor) {
    delete mongoose.models.Floor
}
const Floor = mongoose.model<IFloor>("Floor", FloorSchema)

export default Floor
