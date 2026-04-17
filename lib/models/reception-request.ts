import mongoose, { Schema } from "mongoose"

export interface IReceptionRequest {
  _id?: string
  guestName: string
  faydaId?: string
  phone?: string
  idPhotoFront?: string
  idPhotoBack?: string
  photoUrl?: string
  floorId?: string
  roomNumber?: string
  roomPrice?: number
  inquiryType: string
  checkIn?: string
  checkOut?: string
  checkInTime?: string
  checkOutTime?: string
  guests?: string
  paymentMethod?: "cash" | "mobile_banking" | "telebirr" | "cheque"
  chequeNumber?: string
  paymentReference?: string
  transactionUrl?: string
  notes?: string
  status: "pending" | "guests" | "rejected" | "check_in" | "check_out"
  submittedBy?: string
  reviewedBy?: string
  reviewNote?: string
  createdAt?: Date
  updatedAt?: Date
}

const receptionRequestSchema = new Schema<IReceptionRequest>(
  {
    guestName: { type: String, required: true },
    faydaId: { type: String },
    phone: { type: String },
    idPhotoFront: { type: String },
    idPhotoBack: { type: String },
    photoUrl: { type: String },
    floorId: { type: String },
    roomNumber: { type: String },
    roomPrice: { type: Number },
    inquiryType: { type: String, required: true },
    checkIn: { type: String },
    checkOut: { type: String },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    guests: { type: String },
    paymentMethod: { type: String, enum: ["cash", "mobile_banking", "telebirr", "cheque"] },
    chequeNumber: { type: String },
    paymentReference: { type: String },
    transactionUrl: { type: String },
    notes: { type: String },
    status: { type: String, enum: ["pending", "guests", "rejected", "check_in", "check_out"], default: "pending" },
    submittedBy: { type: String },
    reviewedBy: { type: String },
    reviewNote: { type: String },
  },
  { timestamps: true }
)

// Performance indexes for fast queries
receptionRequestSchema.index({ status: 1, createdAt: -1 })
receptionRequestSchema.index({ createdAt: -1 })
receptionRequestSchema.index({ submittedBy: 1 })
receptionRequestSchema.index({ roomNumber: 1 })

if (mongoose.models.ReceptionRequest) {
  delete mongoose.models.ReceptionRequest
}

const ReceptionRequest = mongoose.model<IReceptionRequest>("ReceptionRequest", receptionRequestSchema)

export default ReceptionRequest
