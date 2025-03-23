import ProjectExpense from '../models/ProjectExpense.js';
import Project from '../models/Project.js';

// Add a new transaction (credit or debit)
export const addProjectTransaction = async (req, res) => {
    const { projectId } = req.params;
    const { purpose, amount, credit } = req.body;

    try {
        // Check if the user is the owner or a collaborator
        const project = await Project.findOne({
            _id: projectId,
            $or: [
                { owner: req.user.id },
                { collaborators: req.user.id }
            ]
        });

        if (!project) return res.status(403).json({ message: "Access denied" });

        // Create the transaction
        const projectTransaction = await ProjectExpense.create({
            projectId,
            purpose,
            amount,
            credit,
            addedBy: req.user.id,
        });

        // Push the new transaction ID to the project's expenses array
        await Project.findByIdAndUpdate(
            projectId,
            { $push: { expenses: projectTransaction._id } },
            { new: true }
        );

        const populatedTransaction = await ProjectExpense.findById(projectTransaction._id).populate('addedBy', 'name email');

        res.status(201).json({ message: "Transaction added successfully", projectTransaction: populatedTransaction });
    } catch (err) {
        res.status(500).json({ message: "Failed to add transaction" });
    }
};

// Get all transactions of a project
export const getProjectTransactions = async (req, res) => {
    const { projectId } = req.params;

    try {
        const transactions = await ProjectExpense.find({ projectId }).populate('addedBy', 'name email');
        res.status(200).json({ transactions });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
};

// Delete a transaction
export const deleteProjectTransaction = async (req, res) => {
    const { projectId, transactionId } = req.params;

    try {
        const transaction = await ProjectExpense.findByIdAndDelete(transactionId);
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });

        await Project.findByIdAndUpdate(projectId, { $pull: { expenses: transactionId } });

        res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete transaction" });
    }
};
