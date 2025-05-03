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

export const createBulkCompanyTransactions = async (req, res) => {
  try {
    const transactionsData = req.body; // Expecting an array of transaction objects
    const userId = req.user._id;
  console.log(transactionsData)
    if (!Array.isArray(transactionsData) || transactionsData.length === 0) {
      return res.status(400).json({ error: 'Input should be a non-empty array of transactions' });
    }

    // Prepare transactions with addedBy and clean empty account fields
    const preparedTransactions = transactionsData.map(tx => ({
      ...tx,
      addedBy: userId,
      account: tx.account === '' ? undefined : tx.account
    }));
   console.log("prepared tnxss" ,preparedTransactions)
    // Insert all transactions in bulk
    const createdTransactions = await CompanyTransaction.insertMany(preparedTransactions);
  console.log("createdTransactions", createdTransactions)
    // Process any debit transactions that need personal transaction counterparts
    const debitTransactionsWithAccount = createdTransactions.filter(
      tx => tx.type === 'Debit' && tx.account
    );

    if (debitTransactionsWithAccount.length > 0) {
      // Get all referenced account categories at once
      const accountIds = debitTransactionsWithAccount.map(tx => tx.account);
      const accountCategories = await AccountCategory.find({ 
        _id: { $in: accountIds } 
      });

      // Create a map for quick lookup
      const accountMap = new Map(
        accountCategories.map(acc => [acc._id.toString(), acc])
      );

      // Prepare personal transactions
      const personalTransactions = debitTransactionsWithAccount
        .filter(tx => accountMap.get(tx.account.toString())?.linkedUser)
        .map(tx => ({
          user: accountMap.get(tx.account.toString()).linkedUser,
          purpose: tx.purpose,
          amount: tx.amount,
          type: 'Credit',
          fileUrl: tx.files?.[0] || '',
          companyTransaction: tx._id
        }));

      // Insert all personal transactions in bulk if any exist
      if (personalTransactions.length > 0) {
        await PersonalTransaction.insertMany(personalTransactions);
      }
    }

    // Sync to Google Sheets (assuming this can handle bulk operations)
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
    const transactions = await CompanyTransaction.find().sort({ createdAt: -1 })
      .populate('account')
      .populate('vendor')
      .populate('addedBy');
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log(err)
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

