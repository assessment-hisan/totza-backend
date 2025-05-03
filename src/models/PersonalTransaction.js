import mongoose from 'mongoose';

const personalTransactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  purpose: String,
  amount: Number,
  type: { type: String, enum: ['Credit', 'Debit'] },
  fileUrl: String,
  companyTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyTransaction' }
}, {
  timestamps: true
});


export default mongoose.model('PersonalTransaction', personalTransactionSchema);
