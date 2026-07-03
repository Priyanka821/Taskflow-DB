import Task from '../models/Task.js';

// Helper: Handle database errors
const handleDBError = (res, error) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }
  console.error('Database Error:', error);
  res.status(500).json({ error: 'Database operation failed' });
};

export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 }).lean();
    // Since lean() bypasses toJSON transform, we need to map id manually or use full documents.
    // Let's map it manually for performance.
    const mappedTasks = tasks.map(task => ({
      id: task._id.toString(),
      text: task.text,
      completed: task.completed,
      createdAt: task.createdAt,
      lastModified: task.lastModified
    }));
    res.status(200).json(mappedTasks);
  } catch (error) {
    handleDBError(res, error);
  }
};

export const createTask = async (req, res) => {
  try {
    const task = new Task({ text: req.body.text });
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (error) {
    handleDBError(res, error);
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        text: req.body.text,
        completed: req.body.completed,
        lastModified: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.status(200).json(task);
  } catch (error) {
    handleDBError(res, error);
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  } catch (error) {
    handleDBError(res, error);
  }
};

// Text Search Implementation
export const searchTasks = async (req, res) => {
  try {
    const results = await Task.find(
      { $text: { $search: req.query.q } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
    res.status(200).json(results);
  } catch (error) {
    handleDBError(res, error);
  }
};

// Pagination
export const getPaginatedTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [tasks, count] = await Promise.all([
      Task.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      Task.countDocuments()
    ]);
    res.status(200).json({
      tasks,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    handleDBError(res, error);
  }
};
