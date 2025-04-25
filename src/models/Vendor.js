import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

export default mongoose.model('Vendor', vendorSchema);
