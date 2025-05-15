// models/Worker.js
import mongoose from 'mongoose';

const WorkerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    
    role: {
      type: String,
      required: true,
      enum: ['Laborer', 'Mason', 'Carpenter', 'Electrician', 'Plumber', 'Foreman', 'Other'],
    },

    dailyWage: {
      type: Number,
      required: true,
    },
 
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On Leave'],
      default: 'Active',
    },
    assignedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Worker', WorkerSchema);