import CompanyTransaction from '../models/CompanyTransaction.js';
import AccountCategory from '../models/AccountCategory.js';
import PersonalTransaction from '../models/PersonalTransaction.js';
import syncToGoogleSheet from '../config/syncToGoogleSheet.js';

export const createCompanyTransaction = async (req, res) => {
  try {
    const cleanedBody = {...req.body};
    
    // Remove empty string for account field to prevent MongoDB casting error
    if (cleanedBody.account === '') {
      delete cleanedBody.account;
    }
    
    const transaction = new CompanyTransaction({
      ...cleanedBody,
      addedBy: req.user._id
    });
    
    
    await transaction.save();
      
      
    // Only proceed if debit and account is set
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


export const getCompanyTransactions = async (req, res) => {
  try {
    const transactions = await CompanyTransaction.find().sort({ createdAt: -1 })
      .populate('account')
      .populate('vendor')
      .populate('addedBy');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRecentCompanyTransactions = async (req, res) => {
  try {
    const recentTransactions = await CompanyTransaction.find()
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(10) // Only get the 10 most recent transactions
      .populate('account')
      .populate('vendor')
      .populate('addedBy');
    
    res.json(recentTransactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteCompanyTransaction = async (req, res) => {
  try {
    const transaction = await CompanyTransaction.findByIdAndDelete(req.params.id);

    if (transaction) {
      // Delete corresponding personal transaction
      
      await PersonalTransaction.deleteOne({ companyTransaction: transaction._id });
    }

    res.json({ message: 'Transaction deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
};

