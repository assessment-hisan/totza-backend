import mongoose from "mongoose";
const companyTransaction = new mongoose.Schema({
  // Core transaction fields
  date: { type: Date, required: true, default: Date.now },
  type: {
    type: String,
    enum: ['Credit', 'Debit', 'Due'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  discount: { type: Number,  min: 0 },
  
  // Due-specific fields
  dueDate: { type: Date }, // Required when type=Due
  originalDueAmount: { type: Number }, // Original due amount
  status: {
    type: String,
    enum: ['Pending', 'Partially Paid', 'Fully Paid'],
    default: 'Pending'
  },

  // Payment tracking (for Due transactions)
  linkedDue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyTransaction'
  },
  payments: [{
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyTransaction'
    },
    status: { // Added payment status
      type: String,
      enum: ['Processing', 'Completed', 'Failed'], // Example statuses
      default: 'Completed' // You might want a different default
    }
  }],

  // General transaction details
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountCategory' },
  vendor: {type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  project: {type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  workers : {type: mongoose.Schema.Types.ObjectId, ref: 'worker' },
  items: { type: String, trim: true },
  purpose: { type: String, trim: true },
  files: [{ type: String }],
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes
companyTransaction.index({ date: 1 });
companyTransaction.index({ dueDate: 1 });
companyTransaction.index({ status: 1 });
companyTransaction.index({ linkedDues: 1 });

// Enhanced validation and logic
companyTransaction.pre('save', async function(next) {
  // Validate Due transactions
  if (this.type === 'Due') {
    if (!this.dueDate) throw new Error('Due date is required for Due transactions');
    this.originalDueAmount = this.originalDueAmount || this.amount;

    // Auto-calculate status based on payments
    if (this.payments.length > 0) {
      const paidAmount = this.payments.reduce((sum, p) => sum + p.amount, 0);
      this.status = paidAmount >= this.amount ? 'Fully Paid' : 'Partially Paid';
    }
  }



  next();
});

// Add method to make payments
companyTransaction.methods.addPayment = async function(paymentTransaction) {
  if (this.type !== 'Due') throw new Error('Only Due transactions can receive payments');

  this.payments.push({
    amount: paymentTransaction.amount,
    paymentTransaction: paymentTransaction._id,
    // You might want to set a status here, e.g., 'Completed'
  });

  return this.save();
};

export default mongoose.model('CompanyTransaction', companyTransaction);