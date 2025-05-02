import mongoose from 'mongoose';

const companyTransactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['Credit', 'Debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountCategory'
  },
  vendor: {
    type: String,
    trim: true
  },
  items: {
    type: String,
    trim: true
  },
  purpose: {
    type: String,
    trim: true
  },
  files: [{
    type: String
  }],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add index for better query performance on date field
companyTransactionSchema.index({ date: 1 });

export default mongoose.model('CompanyTransaction', companyTransactionSchema);