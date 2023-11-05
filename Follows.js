const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const followsSchema = new Schema({
  artist_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
});

const Follows = mongoose.model("Follows", followsSchema);

module.exports = Follows;
