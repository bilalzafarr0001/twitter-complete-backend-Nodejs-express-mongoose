const express = require("express");
const router = express.Router();
const {
  getPosts,
  getPost,
  addPost,
  toggleLike,
  addComment,
  toggleRetweet,
  getTrends,
} = require("../controllers/post");
const { protect } = require("../middleware/auth");

router.route("/").get(getPosts).post(protect, addPost);
router.route("/getTrends").get(protect, getTrends);

router.route("/:id").get(protect, getPost);
router.route("/:id/togglelike").get(protect, toggleLike);
router.route("/:id/toggleRetweet").get(protect, toggleRetweet);
router.route("/:id/comments").post(protect, addComment);

module.exports = router;
