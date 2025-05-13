import CompanyTransaction from '../models/CompanyTransaction.js';
import AccountCategory from '../models/AccountCategory.js';
import PersonalTransaction from '../models/PersonalTransaction.js';
// import syncToGoogleSheet from '../config/syncToGoogleSheet.js';

export const createCompanyTransaction = async (req, res) => {
  try {
    const { type, amount, linkedDue } = req.body;
    const cleanedBody = { ...req.body };

    // Remove empty string for account field to prevent MongoDB casting error
    if (cleanedBody.account === '') {
      delete cleanedBody.account;
    }

    // Validate Due transaction requirements
    if (type === 'Due' && !cleanedBody.dueDate) {
      throw new Error('Due date is required for Due transactions');
    }

   

    const transaction = new CompanyTransaction({
      ...cleanedBody,
      addedBy: req.user._id
    });

    await transaction.save();

    

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
    }else if (transaction.type === 'Credit' && transaction.account) {
      const accountCategory = await AccountCategory.findById(transaction.account);
      if (accountCategory?.linkedUser) {
        const personalTx = new PersonalTransaction({
          user: accountCategory.linkedUser,
          purpose: transaction.purpose,
          amount: transaction.amount,
          type: 'Debit',
          fileUrl: transaction.files?.[0] || '',
          companyTransaction: transaction._id
        });
        await personalTx.save();
      }
    }

    // syncToGoogleSheet();
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
      } else if (transaction.type === 'Credit' && transaction.account) {
        const accountCategory = await AccountCategory.findById(transaction.account);
        if (accountCategory?.linkedUser) {
          const personalTx = new PersonalTransaction({
            user: accountCategory.linkedUser,
            purpose: transaction.purpose,
            amount: transaction.amount,
            type: 'Debit',
            fileUrl: transaction.files?.[0] || '',
            companyTransaction: transaction._id
          });
          await personalTx.save();
        }
      }
    }));

    // syncToGoogleSheet();
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
    if (hasDue === 'true') query.linkedDue = { $exists: true, $not: { $size: 0 } };
    if (hasDue === 'false') query.linkedDue = { $exists: true, $size: 0 };

    const transactions = await CompanyTransaction.find(query)
      .sort({ createdAt: -1 })
      .populate('account')
      .populate('vendor')
      .populate('addedBy')
      .populate('linkedDue')
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
      .populate('linkedDue')
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
  console.log(transaction.payments)
    // Remove payment references from linked Due transactions
    if (transaction.linkedDue ) {
    
        const due = await CompanyTransaction.findById(transaction.linkedDue);
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