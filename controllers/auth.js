const User = require("../model/User");
const asyncHandler = require("../middleware/asyncHandler");

exports.login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next({
      message: "Please provide email and password",
      statusCode: 400,
    });
  }

  const user = await User.findOne({ username });

  if (!user) {
    return res
      .status(400)
      .json({
        ok: false,
        msg: "User Must be Registered First to do Login Operations!",
      });
  }

  const match = await user.checkPassword(password);

  if (!match) {
    return res.status(400).json({ ok: false, msg: "Password is InCorrect" });
  }
  const token = user.getJwtToken();
  res.status(200).json({ success: true, token });
});

exports.signup = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;
  const userExists = await User.findOne({ username });

  if (userExists) {
    return res.status(400).json({ ok: false, msg: "User Already Exists!" });
  }
  const user = await User.create({ username, password });
  const token = user.getJwtToken();

  res.status(201).json({ success: true, token });
});

exports.me = asyncHandler(async (req, res, next) => {
  const { avatar, username, fullname, email, _id, website, bio } = req.user;

  res.status(200).json({
    success: true,
    data: { avatar, username, fullname, email, _id, website, bio },
  });
});
