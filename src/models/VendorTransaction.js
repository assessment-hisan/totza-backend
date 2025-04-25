import mongoose from 'mongoose';

const vendorTransactionSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  purpose: String,
  amount: Number,
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountCategory' },
  type: { type: String, enum: ['Credit', 'Debit'], required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileUrl: String,
  time: { type: Date, default: Date.now },
});

export default mongoose.model('VendorTransaction', vendorTransactionSchema);
