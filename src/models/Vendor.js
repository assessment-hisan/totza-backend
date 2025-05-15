// models/Vendor.js
import mongoose from 'mongoose';

const VendorSchema = new mongoose.Schema(
  {

    companyName: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    vendorType: {
      type: String,
      required: true,
      enum: ['Material Supplier', 'Equipment Rental', 'Service Provider', 'Subcontractor', 'Other'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Vendor', VendorSchema);