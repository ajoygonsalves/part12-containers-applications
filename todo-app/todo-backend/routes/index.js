const express = require("express");
const router = express.Router();
const { Todo } = require("../mongo");
const redis = require("../redis");

const configs = require("../util/config");

let visits = 0;

// Initialize counters when the application starts
(async () => {
  try {
    // Initialize visits counter
    const storedVisits = await redis.getAsync("visits");
    if (storedVisits) {
      visits = parseInt(storedVisits);
      console.log(`Loaded visits counter: ${visits}`);
    } else {
      await redis.setAsync("visits", "0");
      console.log("Initialized visits counter to 0");
    }

    // Initialize created_todos counter if it doesn't exist
    const storedTodos = await redis.getAsync("created_todos");
    if (!storedTodos) {
      const todoCount = await Todo.countDocuments({});
      await redis.setAsync("created_todos", todoCount.toString());
      console.log(`Initialized created_todos counter to ${todoCount}`);
    } else {
      console.log(`Loaded created_todos counter: ${storedTodos}`);
    }
  } catch (error) {
    console.error("Error initializing counters:", error);
  }
})();

/* GET index data. */
router.get("/", async (req, res) => {
  visits++;
  await redis.setAsync("visits", visits);

  res.send({
    ...configs,
    visits,
  });
});

router.get("/todos/:id", async (req, res) => {
  const todo = await Todo.findById(req.params.id);
  res.json(todo);
});

router.post("/", async (req, res) => {
  try {
    const todo = await Todo.create({
      text: req.body.text,
      done: false,
    });
    res.status(201).json(todo); // Explicitly send status and end response

    const count = await redis.getAsync("created_todos");

    if (count) {
      await redis.setAsync("created_todos", parseInt(count) + 1);
    } else {
      await redis.setAsync("created_todos", 1);
    }
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Failed to create todo" });
  }
});

router.get("/statistics", async (req, res) => {
  try {
    const count = await redis.getAsync("created_todos");
    const visits = await redis.getAsync("visits");
    res.json({ added_todos: count, visits });
  } catch (error) {
    console.error("Error getting statistics:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

// New route to reset the created_todos counter to match the actual count
router.get("/reset-todo-counter", async (req, res) => {
  try {
    // Count all todos in MongoDB
    const todoCount = await Todo.countDocuments({});

    // Set the Redis counter to match
    await redis.setAsync("created_todos", todoCount.toString());

    res.json({
      success: true,
      message: "Todo counter reset successfully",
      count: todoCount,
    });
  } catch (error) {
    console.error("Error resetting todo counter:", error);
    res.status(500).json({ error: "Failed to reset todo counter" });
  }
});

module.exports = router;
