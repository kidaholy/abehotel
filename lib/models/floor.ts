import mongoose, { Schema, Document } from "mongoose"

export interface IFloor extends Document {
    floorNumber: string
    description?: string
    order: number
    isActive: boolean
    status?: string
    createdAt: Date
    updatedAt: Date
}

const FloorSchema = new Schema<IFloor>(
    {
        floorNumber: { type: String, required: true, trim: true, unique: true },
        description: { type: String },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        status: { type: String, default: "active" },
    },
    { timestamps: true }
)

const Floor = mongoose.models.Floor || mongoose.model<IFloor>("Floor", FloorSchema)

export default Floor
