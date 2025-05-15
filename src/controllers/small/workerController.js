// controllers/small/workerController.js
import Worker from "../../models/Worker.js";
import CompanyTransaction from "../../models/CompanyTransaction.js";
// Create a new worker
export const createWorker = async (req, res) => {
  try {
    const workerData = req.body;
    workerData.createdBy = req.user._id; // Assuming you have authMiddleware

    const worker = new Worker(workerData);
    await worker.save();

    res.status(201).json(worker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all workers
export const getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().populate('assignedProject', 'title');
    res.json(workers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get worker by ID
export const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('assignedProject', 'title');
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
//Get worker transactions
export const getWorkerTransactions = async (req, res) => {
  try {
    const { worker } = req.query;

    if (!worker) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    // Find transactions where the worker is included in the workers array
    const transactions = await CompanyTransaction.find({
      workers: worker
    })
      .populate('account', 'name')
      .populate('vendor', 'companyName')
      .populate('project', 'title')
      .sort({ date: -1 }) // Newest first
      .lean();

    console.log(transactions)
    // Transform the data for better client-side consumption
    const formattedTransactions = transactions.map(txn => ({
      _id: txn._id,
      type: txn.type,
      amount: txn.amount,
      discount: txn.discount || 0,
      netAmount: txn.amount - (txn.discount || 0),
      date: txn.date,
      dueDate: txn.dueDate,
      status: txn.status,
      account: txn.account?.name || 'N/A',
      vendor: txn.vendor?.companyName || 'N/A',
      project: txn.project?.title || 'N/A',
      purpose: txn.purpose,
      items: txn.items,
      files: txn.files,
      createdAt: txn.createdAt
    }));
   console.log("formateed tnx" , formattedTransactions)
    res.json({
      success: true,
      count: formattedTransactions.length,
      transactions: formattedTransactions
    });

  } catch (error) {
    console.error('Error fetching worker transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
}

// Update worker
export const updateWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json(worker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete worker
export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json({ message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};