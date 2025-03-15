import Expense from '../models/expenses.js';

// Add a new expense
export const createExpense = async (req, res) => {
    const { purpose, amount, time } = req.body;

    try {
        const expense = await Expense.create({ purpose, amount, time, addedBy: req.user.id });
        res.status(201).json({ expense });
    } catch (err) {
        res.status(500).json({ message: "Failed to add expense" });
    }
};

// Get all expenses
export const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ addedBy: req.user.id }).populate('addedBy');
        res.status(200).json({ expenses });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch expenses" });
    }
};

// Get a specific expense by ID
export const getExpenseById = async (req, res) => {
    const { id } = req.params;

    try {
        const expense = await Expense.findOne({ _id: id, addedBy: req.user.id }).populate('addedBy');
        if (!expense) return res.status(404).json({ message: "Expense not found" });

        res.status(200).json({ expense });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch expense" });
    }
};

// Update an expense
export const updateExpense = async (req, res) => {
    const { id } = req.params;
    const { purpose, amount, time } = req.body;

    try {
        const expense = await Expense.findOneAndUpdate(
            { _id: id, addedBy: req.user.id },
            { purpose, amount, time },
            { new: true }
        );

        if (!expense) return res.status(404).json({ message: "Expense not found or not authorized" });

        res.status(200).json({ expense });
    } catch (err) {
        res.status(500).json({ message: "Failed to update expense" });
    }
};

// Delete an expense
export const deleteExpense = async (req, res) => {
    const { id } = req.params;

    try {
        const expense = await Expense.findOneAndDelete({ _id: id, addedBy: req.user.id });

        if (!expense) return res.status(404).json({ message: "Expense not found or not authorized" });

        res.status(200).json({ message: "Expense deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete expense" });
    }
};
