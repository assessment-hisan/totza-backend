import ProjectExpense from '../models/ProjectExpense.js';
import Project from '../models/Project.js';

// Add a new project expense
export const addProjectExpense = async (req, res) => {
    const { projectId } = req.params;
    const { purpose, amount } = req.body;

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

        // Create the project expense
        const projectExpense = await ProjectExpense.create({
            projectId,
            purpose,
            amount,
            addedBy: req.user.id,
        });

        // Push the new expense ID to the project's expenses array
        await Project.findByIdAndUpdate(
            projectId,
            { $push: { expenses: projectExpense._id } },
            { new: true }
        );

        const populatedExpense = await ProjectExpense.findById(projectExpense._id).populate('addedBy', 'name email');

        res.status(201).json({ message: "Expense added successfully", projectExpense: populatedExpense });
    } catch (err) {
        res.status(500).json({ message: "Failed to add expense" });
    }
};

// Get all expenses of a project
export const getProjectExpenses = async (req, res) => {
    const { projectId } = req.params;

    try {
        const expenses = await ProjectExpense.find({ projectId });
        res.status(200).json({ expenses });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch expenses" });
    }
};

// Delete a project expense
export const deleteProjectExpense = async (req, res) => {
    const { projectId, expenseId } = req.params;

    try {
        const expense = await ProjectExpense.findByIdAndDelete(expenseId);
        if (!expense) return res.status(404).json({ message: "Expense not found" });

        // Remove the expense from the project
        await Project.findByIdAndUpdate(projectId, { $pull: { expenses: expenseId } });

        res.status(200).json({ message: "Expense deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete expense" });
    }
};
