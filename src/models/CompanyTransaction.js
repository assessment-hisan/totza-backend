import CompanyTransaction from '../models/CompanyTransaction.js';
import AccountCategory from '../models/AccountCategory.js';
import PersonalTransaction from '../models/PersonalTransaction.js';
import syncToGoogleSheet from '../config/syncToGoogleSheet.js';

export const createCompanyTransaction = async (req, res) => {
  try {
    const { type, amount, linkedDues } = req.body;
    const cleanedBody = { ...req.body };

    // Remove empty string for account field to prevent MongoDB casting error
    if (cleanedBody.account === '') {
      delete cleanedBody.account;
    }

    // Validate Due transaction requirements
    if (type === 'Due' && !cleanedBody.dueDate) {
      throw new Error('Due date is required for Due transactions');
    }

    // Validate payment transaction requirements
    if (linkedDues && linkedDues.length > 0) {
      if (type !== 'Debit') {
        throw new Error('Only Debit transactions can be linked to Due transactions');
      }
      
      // Verify all linked dues exist and are valid
      const existingDues = await CompanyTransaction.find({
        _id: { $in: linkedDues },
        type: 'Due'
      });
      
      if (existingDues.length !== linkedDues.length) {
        throw new Error('One or more linked Due transactions are invalid');
      }
    }

    const transaction = new CompanyTransaction({
      ...cleanedBody,
      addedBy: req.user._id
    });

    await transaction.save();

    // Handle Due payment linking
    if (linkedDues && linkedDues.length > 0) {
      await Promise.all(linkedDues.map(async (dueId) => {
        const due = await CompanyTransaction.findById(dueId);
        if (due) {
          // Add payment record to the Due transaction
          due.payments.push({
            amount: amount,
            paymentTransaction: transaction._id
          });
          
          // Update Due status based on payments
          const paidAmount = due.payments.reduce((sum, p) => sum + p.amount, 0);
          due.status = paidAmount >= due.amount ? 'Fully Paid' : 'Partially Paid';
          
          await due.save();
        }
      }));
    }

    // Handle personal transaction creation for debit transactions
    if (transaction.type === 'Debit' && transaction.account) {
      const accountCategory = await AccountCategory.findById(transaction.account);
      
      if (accountCategory?.linkedUser) {
        const personalTx = new PersonalTransaction({
          user: accountCategory.linkedUser,
          purpose: transaction.purpose,
          amount: transaction.amount,
          type: 'Credit',
          fileUrl: transaction.files?.[0] || '',
          companyTransaction: transaction._id
        });
        await personalTx.save();
      }
    }

    syncToGoogleSheet();
    res.status(201).json(transaction);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const createBulkCompanyTransactions = async (req, res) => {
  try {
    const transactionsData = req.body;
    const userId = req.user._id;

    if (!Array.isArray(transactionsData) || transactionsData.length === 0) {
      return res.status(400).json({ error: 'Input should be a non-empty array of transactions' });
    }

    // Validate all transactions first
    for (const tx of transactionsData) {
      if (tx.type === 'Due' && !tx.dueDate) {
        throw new Error('Due date is required for Due transactions');
      }
      
      if (tx.linkedDues && tx.linkedDues.length > 0 && tx.type !== 'Debit') {
        throw new Error('Only Debit transactions can be linked to Due transactions');
      }
    }

    // Prepare transactions with addedBy and clean empty account fields
    const preparedTransactions = transactionsData.map(tx => ({
      ...tx,
      addedBy: userId,
      account: tx.account === '' ? undefined : tx.account
    }));

    // Insert all transactions in bulk
    const createdTransactions = await CompanyTransaction.insertMany(preparedTransactions);

    // Process Due payments and personal transactions
    await Promise.all(createdTransactions.map(async (transaction) => {
      // Handle Due payment linking
      if (transaction.linkedDues && transaction.linkedDues.length > 0) {
        await Promise.all(transaction.linkedDues.map(async (dueId) => {
          const due = await CompanyTransaction.findById(dueId);
          if (due) {
            due.payments.push({
              amount: transaction.amount,
              paymentTransaction: transaction._id
            });
            
            const paidAmount = due.payments.reduce((sum, p) => sum + p.amount, 0);
            due.status = paidAmount >= due.amount ? 'Fully Paid' : 'Partially Paid';
            
            await due.save();
          }
        }));
      }

      // Handle personal transaction creation for debit transactions
      if (transaction.type === 'Debit' && transaction.account) {
        const accountCategory = await AccountCategory.findById(transaction.account);
        
        if (accountCategory?.linkedUser) {
          const personalTx = new PersonalTransaction({
            user: accountCategory.linkedUser,
            purpose: transaction.purpose,
            amount: transaction.amount,
            type: 'Credit',
            fileUrl: transaction.files?.[0] || '',
            companyTransaction: transaction._id
          });
          await personalTx.save();
        }
      }
    }));

    syncToGoogleSheet();
    res.status(201).json({
      message: `${createdTransactions.length} transactions created successfully`,
      count: createdTransactions.length,
      transactions: createdTransactions
    });
  } catch (err) {
    console.error('Bulk transaction creation error:', err);
    res.status(400).json({ 
      error: err.message,
      details: err.errors ? Object.values(err.errors).map(e => e.message) : null
    });
  }
};

export const getCompanyTransactions = async (req, res) => {
  try {
    const { type, status, hasDue } = req.query;
    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (hasDue === 'true') query.linkedDues = { $exists: true, $not: { $size: 0 } };
    if (hasDue === 'false') query.linkedDues = { $exists: true, $size: 0 };

    const transactions = await CompanyTransaction.find(query)
      .sort({ createdAt: -1 })
      .populate('account')
      .populate('vendor')
      .populate('addedBy')
      .populate('linkedDues')
      .populate('payments.paymentTransaction');

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log(err);
  }
};

export const getRecentCompanyTransactions = async (req, res) => {
  try {
    const recentTransactions = await CompanyTransaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('account')
      .populate('vendor')
      .populate('addedBy')
      .populate('linkedDues')
      .populate('payments.paymentTransaction');
    
    res.json(recentTransactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCompanyTransaction = async (req, res) => {
  try {
    const transaction = await CompanyTransaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Remove payment references from linked Due transactions
    if (transaction.linkedDues && transaction.linkedDues.length > 0) {
      await Promise.all(transaction.linkedDues.map(async (dueId) => {
        const due = await CompanyTransaction.findById(dueId);
        if (due) {
          // Remove this payment from the Due's payments array
          due.payments = due.payments.filter(
            p => p.paymentTransaction.toString() !== transaction._id.toString()
          );
          
          // Recalculate Due status
          const paidAmount = due.payments.reduce((sum, p) => sum + p.amount, 0);
          due.status = paidAmount >= due.amount ? 'Fully Paid' : 
                       paidAmount > 0 ? 'Partially Paid' : 'Pending';
          
          await due.save();
        }
      }));
    }

    // Delete the transaction
    await CompanyTransaction.findByIdAndDelete(req.params.id);

    // Delete corresponding personal transaction if exists
    await PersonalTransaction.deleteOne({ companyTransaction: transaction._id });

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
};

