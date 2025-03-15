import mongoose from 'mongoose';

const projectExpenseSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    purpose: { type: String, required: true },
    amount: { type: Number, required: true },
    time: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const ProjectExpense = mongoose.model('ProjectExpense', projectExpenseSchema);
export default ProjectExpense;
