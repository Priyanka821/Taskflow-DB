import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Task text is required'],
    trim: true,
    minlength: [3, 'Task text must be at least 3 characters'],
    maxlength: [255, 'Task text cannot exceed 255 characters']
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: false, updatedAt: 'lastModified' },
  bufferCommands: false, // Throw immediate error if connection is lost instead of waiting/buffering
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
taskSchema.index({ text: 'text' });
taskSchema.index({ completed: 1 });
taskSchema.index({ completed: 1, createdAt: -1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
