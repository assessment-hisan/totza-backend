import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },  // Added description field
    estimatedBudget: { type: Number, required: true },  // Fixed naming
    endDate: { type: Date },  // Added endDate field
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectExpense' }],  // Added expenses array
    createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);
export default Project;
