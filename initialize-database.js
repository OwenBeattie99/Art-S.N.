const fs = require("fs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const artworks = require("./models/Artworks");
const users = require("./models/Users");
const follows = require("./models/Follows");
const likes = require("./models/Likes");
const reviews = require("./models/Reviews");
const workshops = require("./models/Workshops");
const enrollments = require("./models/Enrollments");

const dbURI = "mongodb://127.0.0.1:27017/gallery";

//Read the seed Gallery Data as JSON
const artworkData = JSON.parse(fs.readFileSync("./gallery.json", "utf-8"));

//Read the seed User Data as JSON
const artistUserData = JSON.parse(fs.readFileSync("./users.json", "utf-8"));

// connect to mongodb
mongoose.connect(dbURI).then(() => console.log("db connected"));

const importData = async () => {
  try {
    await artworks.create(artworkData);
    console.log("Artwork Collection created and data imported");

    await users.create(artistUserData);
    console.log("Users Collection created and data imported");

    await follows.create();
    console.log("Follows Collection successfully created");

    await likes.create();
    console.log("Likes Collection successfully created");

    await reviews.create();
    console.log("Reviews Collection successfully created");

    await workshops.create();
    console.log("Workshops Collection successfully created");

    await enrollments.create();
    console.log("Enrollments Collection successfully created");
    await process.exit();
  } catch (error) {
    console.log("error", error);
  }
};

importData();
