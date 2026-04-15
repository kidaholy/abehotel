import mongoose, { Schema, Document } from "mongoose"

export interface ICategory extends Document {
    name: string
    type: 'menu' | 'stock' | 'fixed-asset' | 'expense' | 'room' | 'service' | 'vip1-menu' | 'vip2-menu' | 'distribution'
    description?: string
    createdAt: Date
    updatedAt: Date
}

const categorySchema = new Schema<ICategory>(
    {
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ['menu', 'stock', 'fixed-asset', 'expense', 'room', 'service', 'vip1-menu', 'vip2-menu', 'distribution'], required: true },
        description: { type: String },
    },
    { timestamps: true }
)

const Category = mongoose.models.Category || mongoose.model<ICategory>("Category", categorySchema)

// Patch stale model enum in development if necessary
if (mongoose.models.Category) {
    const typePath = mongoose.models.Category.schema.path('type') as any;
    if (typePath && typePath.enumValues && !typePath.enumValues.includes('distribution')) {
        typePath.enumValues.push('distribution');
    }
}

export default Category
