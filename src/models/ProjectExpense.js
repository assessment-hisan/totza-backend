import mongoose from 'mongoose';

const projectExpenseSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    purpose: { type: String, required: true },
    amount: { type: Number, required: true },
    credit: { type: Boolean, required: true },  // New field to indicate credit or debit
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const ProjectExpense = mongoose.model('ProjectExpense', projectExpenseSchema);
export default ProjectExpense;
