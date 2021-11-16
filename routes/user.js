const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUser,
  follow,
  unfollow,
  feed,
  editUser,
  publicFeed,
} = require("../controllers/user");
const { protect } = require("../middleware/auth");

router.route("/").get(protect, getUsers);
router.route("/feed").get(protect, feed);
router.route("/publicFeed").get(protect, publicFeed);
router.route("/").post(protect, editUser);
router.route("/:username").get(protect, getUser);
router.route("/:id/follow").get(protect, follow);
router.route("/:id/unfollow").get(protect, unfollow);

module.exports = router;
