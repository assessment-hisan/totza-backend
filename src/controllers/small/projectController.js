import Project from "../../models/Projects.js"

// Create a new project
export const createProject = async (req, res) => {
  try {
    const { title, description, startDate, endDate, status, estimatedBudget } = req.body;
    const createdBy = req.user._id; // Assuming authMiddleware attaches user

    const project = new Project({
      title,
      description,
      startDate,
      endDate,
      status,
      estimatedBudget,
      createdBy,
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.find({
      _id: req.params.id,
    })
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project)
  } catch (error) {
    
  }
}
 
// Delete a project
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};