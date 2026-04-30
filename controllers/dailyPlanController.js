const DailyPlan = require('../models/DailyPlan');
const studyEngine = require('../services/studyEngine');

const getTodayPlan = async (req, res) => {
    try {
        const userId = req.userId;
        const plan = await studyEngine.generateDailyPlan(userId);
        
        if (!plan) return res.status(200).json({ tasks: [], smartMessage: "Let's start by creating a new subject!" });
        
        res.status(200).json(plan);
    } catch (error) {
        res.status(500).json({ error: "Failed to load study plan" });
    }
};

const completeTask = async (req, res) => {
    try {
        const userId = req.userId;
        const { taskId } = req.body;
        const todayStr = new Date().toISOString().split('T')[0];
        
        const plan = await DailyPlan.findOne({ userId, date: todayStr });
        if (!plan) return res.status(404).json({ error: "Plan not found" });

        const task = plan.tasks.find(t => t.id === taskId);
        if (task) {
            task.isCompleted = true;
            await plan.save();
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update task" });
    }
};

module.exports = {
    getTodayPlan,
    completeTask
};
