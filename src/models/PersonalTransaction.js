import mongoose from 'mongoose';

const personalTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  purpose: String,
  amount: Number,
  type: { type: String, enum: ['Credit', 'Debit'] },
  fileUrl: String,
  time: { type: Date, default: Date.now },
  companyTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyTransaction' } // ✅ new
});


export default mongoose.model('PersonalTransaction', personalTransactionSchema);
