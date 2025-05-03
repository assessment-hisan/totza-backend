import PersonalTransaction from '../models/PersonalTransaction.js';



export const createPersonalTransaction = async (req, res) => {
  try {
  
    const transaction = new PersonalTransaction({
      ...req.body,
      user : req.user._id
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getPersonalTransactions = async (req, res) => {
  try {
    const transactions = await PersonalTransaction.find({ user: req.user._id })
     
    res.json(transactions);
    console.log(transactions[0])
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deletePersonalTransaction = async (req, res) => {
  try {
    await PersonalTransaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
};
