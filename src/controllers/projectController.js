import Project from '../models/Project.js';

// Create a new project
export const createProject = async (req, res) => {
    const { name, description, estimatedBudget, endDate, collaborators } = req.body;

    try {
        const project = await Project.create({
            name,
            description,
            estimatedBudget,  // Fixed naming
            owner: req.user.id,
            endDate,
            collaborators
        });

        res.status(201).json({ project });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create project" });
    }
};


// Get all projects the user is involved in (either as owner or collaborator)
export const getProjects = async (req, res) => {
    try {
        const projects = await Project.find({
            $or: [
                { owner: req.user.id },
                { collaborators: req.user.id }
            ]
        })
        .populate('owner', 'name email')          // Populating owner with selected fields
        // .populate('collaborators', 'name email'); // Populating collaborators

        res.status(200).json({ projects });
    } catch (err) {
        console.error("Error fetching projects:", err);
        res.status(500).json({ message: "Failed to fetch projects" });
    }
};



// Get project by ID
export const getProjectById = async (req, res) => {
    const { id } = req.params;

    try {
        const project = await Project.findOne({
            _id: id,
            $or: [
                { owner: req.user.id },
                { collaborators: req.user.id }
            ]
        })
        .populate('collaborators')  // Populate collaborators
        .populate({
            path: 'expenses',         // Populate expenses
            populate: { path: 'addedBy', select: 'name email' }  // Include addedBy user details
        }).populate('owner', 'name email');

        if (!project) return res.status(404).json({ message: "Project not found or access denied" });

        res.status(200).json({ project });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch project" });
    }
};


// Add Collaborator to Project
export const addCollaborator = async (req, res) => {
    const { id } = req.params;
    const { collaboratorId } = req.body;

    try {
        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Check if the user is already a collaborator
        if (project.collaborators.includes(collaboratorId)) {
            return res.status(400).json({ message: "User is already a collaborator" });
        }

        project.collaborators.push(collaboratorId);
        await project.save();

        res.status(200).json({ message: "Collaborator added successfully", project });
    } catch (err) {
        res.status(500).json({ message: "Failed to add collaborator" });
    }
};
