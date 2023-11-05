const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const likesSchema = new Schema({
  artwork_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
});

const Likes = mongoose.model("Likes", likesSchema);

module.exports = Likes;
