import mongoose from 'mongoose';

const companyTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['Credit', 'Debit'], required: true },
  amount: Number,
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountCategory' },
  // vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendor : String,
  items : String,
  purpose: String,
  files: [String],
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('CompanyTransaction', companyTransactionSchema);
