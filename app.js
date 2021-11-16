const express = require("express");
const mongoose = require("mongoose");
const auth = require("./routes/auth");
const post = require("./routes/post");
const user = require("./routes/user");
var morgan = require("morgan");

const cors = require("cors");
const app = express();
app.use(morgan("combined"));

app.use(express.json());
app.use(cors());
// Logic goes here

mongoose.connect("mongodb://localhost:27017/twitter", {
  useNewUrlParser: "true",
});
mongoose.connection.on("error", (err) => {
  console.log("err", err);
});
mongoose.connection.on("connected", (err, res) => {
  console.log("Mongoose Database is connected");
});

app.use("/api/v1/auth/", auth);
app.use("/api/v1/posts/", post);
app.use("/api/v1/users/", user);

module.exports = app;
