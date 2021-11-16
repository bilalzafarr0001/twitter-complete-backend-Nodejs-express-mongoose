const mongoose = require("mongoose");
const Post = require("../model/Post");
const User = require("../model/User");
const Comment = require("../model/Comment");
const asyncHandler = require("../middleware/asyncHandler");

// get Posts
exports.getPosts = asyncHandler(async (req, res, next) => {
  const posts = await Post.find({}).populate({
    path: "user",
    select: "username avatar",
  });

  res.status(200).json({ success: true, data: posts });
});

exports.getTrends = asyncHandler(async (req, res, next) => {
  const posts = await Post.find({ commentsCount: { $gte: 10 } })
    .populate({
      path: "user",
      select: "username avatar",
    })
    .sort({ commentsCount: -1 });

  res.status(200).json({ success: true, data: posts });
});

// get single post
exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id)
    .populate({
      path: "comments",
      select: "text createdAt",
      populate: {
        path: "user",
        select: "username avatar",
      },
    })
    .populate({
      path: "user",
      select: "username avatar",
    })
    .lean()
    .exec();

  if (!post) {
    return next({
      message: `No post found for id ${req.params.id}`,
      statusCode: 404,
    });
  }

  post.isMine = req.user.id === post.user._id.toString();

  const likes = post.likes.map((like) => like.toString());
  post.isLiked = likes.includes(req.user.id);

  const retweets =
    post.retweets && post.retweets.map((retweet) => retweet.toString());
  post.isRetweeted = retweets && retweets.includes(req.user.id);
  post.isCommentMine = false;
  post.comments.forEach((comment) => {
    comment.isCommentMine = false;

    const userStr = comment.user._id.toString();
    if (userStr === req.user.id) {
      comment.isCommentMine = true;
    }
  });
  res.status(200).json({ success: true, data: post });
});

exports.addPost = asyncHandler(async (req, res, next) => {
  console.log("req.body", req.body);

  const { caption, files } = req.body;
  const user = req.user.id;
  console.log(req.user.id);
  let post = await Post.create({ caption, files, user });

  await User.findByIdAndUpdate(req.user.id, {
    $push: { posts: post._id },
    $inc: { postCount: 1 },
  });

  post = await post.populate({ path: "user", select: " username " });

  res.status(200).json({ success: true, data: post });
});

exports.toggleLike = asyncHandler(async (req, res, next) => {
  // make sure that the post exists
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next({
      message: `No post found for id ${req.params.id}`,
      statusCode: 404,
    });
  }

  if (post.likes.includes(req.user.id)) {
    const index = post.likes.indexOf(req.user.id);
    post.likes.splice(index, 1);
    post.likesCount = post.likesCount - 1;
    await post.save();
  } else {
    post.likes.push(req.user.id);
    post.likesCount = post.likesCount + 1;
    await post.save();
  }

  res.status(200).json({ success: true, data: {} });
});

exports.toggleRetweet = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next({
      message: `No post found for id ${req.params.id}`,
      statusCode: 404,
    });
  }

  if (post.retweets.includes(req.user.id)) {
    const index = post.retweets.indexOf(req.user.id);
    post.retweets.splice(index, 1);
    post.retweetCount = post.retweetCount - 1;

    await post.save();

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { posts: req.params.id },
      $inc: { postCount: -1 },
    });
  } else {
    post.retweets.push(req.user.id);
    post.retweetCount = post.retweetCount + 1;

    await post.save();

    await User.findByIdAndUpdate(req.user.id, {
      $push: { posts: post._id },
      $inc: { postCount: 1 },
    });
  }

  res.status(200).json({ success: true, data: {} });
});

exports.addComment = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next({
      message: `No post found for id ${req.params.id}`,
      statusCode: 404,
    });
  }

  let comment = await Comment.create({
    user: req.user.id,
    post: req.params.id,
    text: req.body.text,
  });

  post.comments.unshift(comment._id);
  post.commentsCount = post.commentsCount + 1;
  await post.save();

  comment = await comment
    .populate({ path: "user", select: "avatar username" })
    .execPopulate();

  res.status(200).json({ success: true, data: comment });
});
