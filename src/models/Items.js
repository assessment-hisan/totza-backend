import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rate: { type: Number, required: true },
  unit: String,
  description: String,
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

export default mongoose.model('Item', itemSchema);
