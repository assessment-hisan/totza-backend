import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    purpose: { type: String, required: true },
    amount: { type: Number, required: true },
    time: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
