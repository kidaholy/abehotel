import mongoose, { Schema } from "mongoose"

interface IUser {
  name: string
  email: string
  password: string
  plainPassword?: string
  role: "admin" | "cashier" | "chef" | "bar" | "display" | "store_keeper" | "reception" | "custom"
  permissions?: string[]
  isActive: boolean
  floorId?: mongoose.Types.ObjectId | string
  assignedCategories?: string[]
  canManageReception?: boolean
  lastLoginAt?: Date
  lastLogoutAt?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String },
    role: { type: String, enum: ["admin", "cashier", "chef", "bar", "display", "store_keeper", "reception", "custom"], default: "cashier" },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    floorId: { type: Schema.Types.ObjectId, ref: "Floor" },
    assignedCategories: [{ type: String }],
    canManageReception: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    lastLogoutAt: { type: Date },
  },
  { timestamps: true },
)

// Force model re-registration to clear any ghost schemas
if (mongoose.models.User) {
  delete mongoose.models.User
}
const User = mongoose.model<IUser>("User", userSchema)

export default User
