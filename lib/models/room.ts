import mongoose, { Schema, Document } from "mongoose"

export interface IRoom extends Document {
    roomNumber: string
    name?: string
    floorId: mongoose.Types.ObjectId
    type: 'standard' | 'deluxe' | 'suite' | 'other'
    category: string // e.g. "Single", "Double"
    price: number
    status: 'available' | 'occupied' | 'maintenance' | 'dirty'
    isActive: boolean
    description?: string
    roomServiceMenuTier?: 'standard' | 'vip1' | 'vip2'
    createdAt: Date
    updatedAt: Date
}

const RoomSchema = new Schema<IRoom>(
    {
        roomNumber: { type: String, required: true, unique: true, trim: true },
        name: { type: String },
        floorId: { type: Schema.Types.ObjectId, ref: "Floor", required: true },
        type: { 
            type: String, 
            enum: ['standard', 'deluxe', 'suite', 'other'], 
            default: 'standard' 
        },
        category: { type: String, default: "Standard" },
        price: { type: Number, default: 0 },
        status: { 
            type: String, 
            enum: ['available', 'occupied', 'maintenance', 'dirty'], 
            default: 'available' 
        },
        isActive: { type: Boolean, default: true },
        description: { type: String },
        roomServiceMenuTier: { type: String, enum: ['standard', 'vip1', 'vip2'], default: 'standard' },
    },
    { timestamps: true }
)

// Force model re-registration to pick up new schema fields
if (mongoose.models.Room) {
    delete mongoose.models.Room
}

const Room = mongoose.model<IRoom>("Room", RoomSchema)

export default Room
