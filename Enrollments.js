const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const enrollmentsSchema = new Schema({
  workshop_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
});

const Enrollments = mongoose.model("Enrollments", enrollmentsSchema);

module.exports = Enrollments;
