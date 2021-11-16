const User = require("../model/User");
const Post = require("../model/Post");
const asyncHandler = require("../middleware/asyncHandler");
const { count } = require("../model/Post");

exports.getUsers = asyncHandler(async (req, res, next) => {
  let users = await User.find().select("-password").lean().exec();

  users.forEach((user) => {
    user.isFollowing = false;
    const followers = user.followers.map((follower) => follower._id.toString());
    if (followers.includes(req.user.id)) {
      user.isFollowing = true;
    }
  });

  users = users.filter((user) => user._id.toString() !== req.user.id);

  res.status(200).json({ success: true, data: users });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  const num = Number(req.query.per_page) * Number(req.query.page);
  console.log(" Num", num);

  const user = await User.findOne({ username: req.params.username })
    .populate({
      path: "posts",
      limit: Number(num),
      select:
        "user retweets retweetCount isLiked likes createdAt caption files likesCount commentsCount comments",
      populate: { path: "user", select: "username avatar" },
    })
    .populate({ path: "followers", select: "username followersCount" })
    .populate({ path: "following", select: "username followingCount" })

    .sort("-createdAt")
    .lean()
    .exec();

  console.log("Users lenght is ", user.postCount);
  if (!user) {
    return next({
      message: `The user ${req.params.username} is not found`,
      statusCode: 404,
    });
  }
  const totalFeedLength = Math.ceil(user.postCount / 4);
  console.log("Length of Feed is ", totalFeedLength);

  user.posts.username = req.params.username;

  user.posts.forEach((post) => {
    post.isLiked = false;
    const likes = post.likes.map((like) => like.toString());
    if (likes.includes(req.user.id)) {
      post.isLiked = true;
    }

    post.isRetweeted = false;
    const retweets =
      post.retweets && post.retweets.map((retweet) => retweet.toString());
    if (retweets && retweets.includes(req.user.id)) {
      post.isRetweeted = true;
    }
  });

  user.isFollowing = false;
  const followers = user.followers.map((follower) => follower._id.toString());

  if (followers.includes(req.user.id)) {
    user.isFollowing = true;
  }

  user.isMe = req.user.id === user._id.toString();

  res
    .status(200)
    .json({ success: true, data: user, lengthPost: totalFeedLength });
});

exports.follow = asyncHandler(async (req, res, next) => {
  // make sure the user exists
  const user = await User.findById(req.params.id);

  if (!user) {
    return next({
      message: `No user found for id ${req.params.id}`,
      statusCode: 404,
    });
  }

  // make the sure the user is not the logged in user
  if (req.params.id === req.user.id) {
    return next({ message: "You can't unfollow/follow yourself", status: 400 });
  }

  // only follow if the user is not following already
  if (user.followers.includes(req.user.id)) {
    return next({ message: "You are already following him", status: 400 });
  }

  await User.findByIdAndUpdate(req.params.id, {
    $push: { followers: req.user.id },
    $inc: { followersCount: 1 },
  });
  await User.findByIdAndUpdate(req.user.id, {
    $push: { following: req.params.id },
    $inc: { followingCount: 1 },
  });

  res.status(200).json({ success: true, data: {} });
});

exports.unfollow = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next({
      message: `No user found for ID ${req.params.id}`,
      statusCode: 404,
    });
  }

  // make the sure the user is not the logged in user
  if (req.params.id === req.user.id) {
    return next({ message: "You can't follow/unfollow yourself", status: 400 });
  }

  await User.findByIdAndUpdate(req.params.id, {
    $pull: { followers: req.user.id },
    $inc: { followersCount: -1 },
  });
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { following: req.params.id },
    $inc: { followingCount: -1 },
  });

  res.status(200).json({ success: true, data: {} });
});

exports.feed = asyncHandler(async (req, res, next) => {
  const following = req.user.following;
  const num = Number(req.query.per_page) * Number(req.query.page);
  console.log(" Num", num);
  // console.log("req.query.per_page", req.query.per_page);
  // console.log("req.query.page", req.query.page);
  const users = await User.find()
    .where("_id")
    .in(following.concat([req.user.id]))
    .exec();

  const postIds = users.map((user) => user.posts).flat();
  // console.log("User Feed Posts Length : ", postIds.length);
  const posts = await Post.find({})
    .populate({ path: "user", select: "username avatar" })
    .limit(Number(num))
    .sort("-createdAt")
    .where("_id")
    .in(postIds)
    .lean()
    .exec();
  console.log("Post length", posts.length);
  console.log("Post IDS  length", postIds.length);

  const totalFeedLength = Math.ceil(postIds.length / 4);
  console.log("Length of Feed is ", totalFeedLength);

  posts.forEach((post) => {
    // is the loggedin user liked the post
    post.isLiked = false;
    const likes = post.likes.map((like) => like.toString());
    if (likes.includes(req.user.id)) {
      post.isLiked = true;
    }

    post.isRetweeted = false;
    const retweets =
      post.retweets && post.retweets.map((retweet) => retweet.toString());
    if (retweets && retweets.includes(req.user.id)) {
      post.isRetweeted = true;
    }

    // is the post belongs to the loggedin user
    post.isMine = false;
    if (post.user._id.toString() === req.user.id) {
      post.isMine = true;
    }
  });

  res
    .status(200)
    .json({ success: true, data: posts, lengthPost: totalFeedLength });
});

exports.publicFeed = asyncHandler(async (req, res, next) => {
  const users = await User.find({ _id: { $ne: req.user.id } }).exec();
  const postIds = users.map((user) => user.posts).flat();

  const posts = await Post.find({})
    .populate({ path: "user", select: "username avatar" })
    .sort("-createdAt")
    .where("_id")
    .in(postIds)
    .lean()
    .exec();

  posts.forEach((post) => {
    // is the loggedin user liked the post
    post.isLiked = false;
    const likes = post.likes.map((like) => like.toString());
    if (likes.includes(req.user.id)) {
      post.isLiked = true;
    }

    post.isRetweeted = false;
    const retweets =
      post.retweets && post.retweets.map((retweet) => retweet.toString());
    if (retweets && retweets.includes(req.user.id)) {
      post.isRetweeted = true;
    }

    // is the post belongs to the loggedin user
    post.isMine = false;
    if (post.user._id.toString() === req.user.id) {
      post.isMine = true;
    }
  });

  res.status(200).json({ success: true, data: posts });
});

exports.editUser = asyncHandler(async (req, res, next) => {
  const { fullname, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      $set: { username: fullname, avatar: avatar },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({ success: true, data: user });
});
