const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewsSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  artwork_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
});

const Reviews = mongoose.model("Reviews", reviewsSchema);

module.exports = Reviews;
