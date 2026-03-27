import mongoose, { Schema } from "mongoose"

export interface IReceptionRequest {
  _id?: string
  guestName: string
  phone?: string
  roomNumber?: string
  inquiryType: string
  checkIn?: string
  checkOut?: string
  guests?: string
  notes?: string
  status: "pending" | "approved" | "denied"
  submittedBy?: string // user id of reception staff
  reviewedBy?: string // user id of cashier
  reviewNote?: string
  createdAt?: Date
  updatedAt?: Date
}

const receptionRequestSchema = new Schema<IReceptionRequest>(
  {
    guestName: { type: String, required: true },
    phone: { type: String },
    roomNumber: { type: String },
    inquiryType: { type: String, required: true },
    checkIn: { type: String },
    checkOut: { type: String },
    guests: { type: String },
    notes: { type: String },
    status: { type: String, enum: ["pending", "approved", "denied"], default: "pending" },
    submittedBy: { type: String },
    reviewedBy: { type: String },
    reviewNote: { type: String },
  },
  { timestamps: true }
)

if (mongoose.models.ReceptionRequest) {
  delete mongoose.models.ReceptionRequest
}

const ReceptionRequest = mongoose.model<IReceptionRequest>("ReceptionRequest", receptionRequestSchema)

export default ReceptionRequest
