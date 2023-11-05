const artworks = require("./models/Artworks");
const users = require("./models/Users");
const follows = require("./models/Follows");
const likes = require("./models/Likes");
const reviews = require("./models/Reviews");
const workshops = require("./models/Workshops");
const express = require("express");
const mongoose = require("mongoose");

const pug = require("pug");
const { response } = require("express");
const enrollments = require("./models/Enrollments");
var ObjectId = require("mongodb").ObjectId;

const app = express();
const dbURI = "mongodb://127.0.0.1:27017/gallery";

const compiledIndexPage = pug.compileFile("./templates/index.pug");
const compiledLoginPage = pug.compileFile("./templates/login.pug");
const compiledAccountPage = pug.compileFile("./templates/account.pug");
const compiledSearchPage = pug.compileFile("./templates/search.pug");
const compiledArtworkPage = pug.compileFile("./templates/artwork.pug");
const compiledAddArtworkPage = pug.compileFile("./templates/add-artwork.pug");
const compiledProfilePage = pug.compileFile("./templates/artist.pug");
const compiledAddWorkshopPage = pug.compileFile("./templates/add-workshop.pug");

// Port that Express will Listen on for requests
const PORT = 8080;

const RATING = {
  One: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
};

Object.freeze(RATING);

const navigationPages = [
  { url: "/home", title: "Home", key: "home" },
  { url: "/search", title: "Search", key: "search" },
];

// Enable Debugging output for Mongoose Queries
//mongoose.set("debug", true);

// Serve static code files from the public directory
app.use(express.static("public"));

// Parse requests of content-type -> application/json
app.use(express.json());

// Parse requests of content-type -> application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Store the Authentication Cookie for each request
app.use((req, res, next) => {
  const {
    headers: { cookie },
  } = req;

  if (cookie) {
    const values = cookie.split(";").reduce((res, item) => {
      const data = item.trim().split("=");
      return { ...res, [data[0]]: data[1] };
    }, {});
    res.locals.cookie = values;
  } else res.locals.cookie = {};
  next();
});

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Index Page Route
app.get(["/", "/index", "/home"], async (req, res) => {
  // console.log("User ID Cookie? " + res.locals.cookie.id);
  // console.log("User isLoggedIn Cookie? " + res.locals.cookie.isLoggedin);

  try {
    let artistResults = await users.distinct("name", { type: "artist" });

    // Get distinct Categories
    let categoryResults = await artworks.distinct("category");

    // return Index Page
    res.send(
      compiledIndexPage({
        Title: "Index Page",
        artists: artistResults,
        categories: categoryResults,
        navigation: navigationPages,
        IsLoggedIn: isUserLoggedIn(res.locals.cookie.isLoggedin),
        PageUrl: "/home",
      })
    );
  } catch (err) {
    console.log("In Index Page's Error Handler");
    console.error(err.message);
  }
});

app.get("/search", async (req, res) => {
  const { query, field, page = 1, limit = 10 } = req.query;

  // let year = req.query.year;

  let filter = {};

  if (field == "all") {
    // Have to build an 'or' query filter
    // { $or: [{ name: "Rambo" }, { breed: "Pugg" }, { age: 2 }] };
    let searchFilterProperty = "$or";

    filter[searchFilterProperty] = [];

    let nameObj = { name: new RegExp(query, "i") };
    let artistObj = { artist: new RegExp(query, "i") };
    let categoryObj = { category: new RegExp(query, "i") };
    let mediumObj = { medium: new RegExp(query, "i") };

    filter[searchFilterProperty].push(nameObj);
    filter[searchFilterProperty].push(artistObj);
    filter[searchFilterProperty].push(categoryObj);
    filter[searchFilterProperty].push(mediumObj);

    console.log(filter);
  } else if (field == "category") {
    filter.category = new RegExp(query, "i");
  } else if (field == "artist") {
    filter.artist = new RegExp(query, "i");
  } else if (field == "name") {
    filter.name = new RegExp(query, "i");
  } else if (field == "medium") {
    filter.medium = new RegExp(query, "i");
  }

  console.log(filter);

  try {
    // execute query with page and limit values
    let categoryResults = await artworks
      .find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    let intPageNumber = parseInt(page);

    if (isNaN(intPageNumber)) {
      throw new Error("INVALID");
    }

    let searchResultsCount = await artworks.countDocuments(filter);

    let totalPages = Math.ceil(searchResultsCount / limit);

    let pageModel = {
      title: "Gallery Search Results",
      currentPage: page,
      results: categoryResults,
      totalPages: totalPages,
      navigation: navigationPages,
      IsLoggedIn: res.locals.cookie.isLoggedin,
      PageUrl: "/search",
      searchQuery: query,
      searchField: field,
    };

    if (intPageNumber < totalPages) {
      pageModel.nextPage = intPageNumber + 1;
    }

    if (intPageNumber != 1 && totalPages > 1) {
      pageModel.previousPage = intPageNumber - 1;
    }

    console.log(pageModel);

    res.send(compiledSearchPage(pageModel));
  } catch (err) {
    console.error(err.message);
    if (err.message == "INVALID") {
      res.sendStatus(400);
    } else {
      res.sendStatus(500);
    }
  }
});

// Login Page Route
app.get("/login", (req, res) => {
  // return Login Page
  res.send(
    compiledLoginPage({
      Title: "Login Page",
      navigation: navigationPages,
      PageUrl: "/login",
    })
  );
});

// Logout Page Route
app.get("/logout", (req, res) => {
  res.clearCookie("isLoggedin");
  res.clearCookie("id");

  // redirect to home page
  res.redirect(302, "/home");
});

// Login Submit API Route
app.post("/submit-login", async (req, res) => {
  console.log(req.body);
  //finds existing username
  await users
    .findOne({
      name: req.body.username,
    })
    .then(async (user) => {
      if (user) {
        //if a user is found, one already exists, alert and refresh the page
        //console.log("User Exists");
        //console.log("User:    " + user);
        //console.log("Request Password: " + req.body.password);
        //console.log("User Password:    " + user.password);
        if (req.body.password != user.password) {
          console.log("Error: Invalid Password");
          res.sendStatus(403);
        } else {
          //successfully creates account
          //console.log("Passwords Match");
          res.setHeader("Set-Cookie", "isLoggedin=true");
          console.log(user._id.toString());
          res.cookie("id", user._id.toString());
          res.sendStatus(200);
        }
      } else {
        //User does not exist in Collection
        let newUserDoc = new users();
        newUserDoc.name = req.body.username;
        newUserDoc.password = req.body.password;
        newUserDoc.type = "patron";

        let userDoc = await newUserDoc.save();

        console.log(userDoc);
        res.setHeader("Set-Cookie", "isLoggedin=true");
        res.cookie("id", userDoc._id.toString());
        res.sendStatus(200);
      }
    });
});

// Account Settings Page Route
app.get("/account", async (req, res) => {
  if (!res.locals.cookie.isLoggedin) {
    res.send(403);
  } else {
    try {
      console.log("Retrieving Account Profile Data");

      let followedArtistNames = [];
      let followedArtistIds = [];

      let userData = await getUserById(res.locals.cookie.id);

      let reviewData = await getAggregateReviewsForUser(res.locals.cookie.id);

      let followData = await getAggregateFollows(res.locals.cookie.id);

      console.log(followData);

      followData.forEach((follow) => {
        followedArtistIds.push(follow.artist_id);
        followedArtistNames.push(follow.artist.name);
      });

      // Create Date object and subtract 5 minutes, to use in the count query to check for updates from followed Artists
      let date = new Date();
      date.setMinutes(date.getMinutes() - 10);

      let countFollowedArtworksUpdates = await artworks.countDocuments({
        artist: { $in: followedArtistNames },
        createdAt: { $gt: date },
      });

      console.log(`Artkwork updates count: ${countFollowedArtworksUpdates}`);

      let countFollowedWorkshopUpdates = await workshops.countDocuments({
        user_id: { $in: followedArtistIds },
        createdAt: { $gt: date },
      });

      console.log(`Workshop updates count: ${countFollowedWorkshopUpdates}`);

      let likeData = await getArtworkLikesForUser(res.locals.cookie.id);

      let workshopData = await getWorkshopsByUser(res.locals.cookie.id);

      // execute query with page and limit values
      let artworkData = await artworks.find({ artist: userData.name }).exec();

      // return Account Page
      res.send(
        compiledAccountPage({
          Title: "Account Settings",
          navigation: navigationPages,
          User: userData,
          Reviews: reviewData,
          IsLoggedIn: isUserLoggedIn(res.locals.cookie.isLoggedin),
          PageUrl: "/account",
          Follows: followData,
          Likes: likeData,
          Workshops: workshopData,
          Artworks: artworkData,
          FollowedArtworkUpdates: countFollowedArtworksUpdates,
          FollowedWorkshopUpdates: countFollowedWorkshopUpdates,
        })
      );
    } catch (err) {
      console.error(err.message);
    }
  }
});

//Account Update Page route
app.put("/account", async (req, res) => {
  if (!res.locals.cookie.isLoggedin) {
    res.send(403);
  } else {
    try {
      console.log("Updating account settings");
      console.log(req.body);

      const userDocument = await users.findOne({ _id: res.locals.cookie.id });
      console.log(userDocument);

      userDocument.type = req.body.type;
      userDocument.password = req.body.password;

      await userDocument.save();

      res.sendStatus(200);
    } catch (err) {
      console.error(err.message);
      res.sendStatus(500);
    }
  }
});

// Artwork Page Route
app.get("/artwork/:id", async (req, res) => {
  let isLoggedIn = isUserLoggedIn(res.locals.cookie.isLoggedin);
  let alreadyReviewed = false;

  const artworkId = req.params["id"];

  try {
    // Get the artwork document
    let artworkResult = await artworks.findById(artworkId).exec();

    let isAlreadyLiked = await checkExistingLikes(
      res.locals.cookie.id,
      artworkId
    );

    let likeCountResults = await likes
      .countDocuments({ artwork_id: artworkId })
      .exec();

    // execute query with page and limit values
    let artworkReviews = await getReviewsbyArtwork(artworkId);

    let userData = {};

    if (isLoggedIn) {
      artworkReviews.forEach(function (document) {
        console.log(document.text);
        console.log(document.user_id);
        console.log(res.locals.cookie.id);
        if (document.user_id == res.locals.cookie.id) {
          console.log("Found review for current user");
          alreadyReviewed = true;
        }
      });

      userData = await getUserById(res.locals.cookie.id);
    } else {
      // Required for Pug Template references
      userData._id = "";
    }

    res.send(
      compiledArtworkPage({
        Title: "Artwork - " + artworkResult.name,
        Artwork: artworkResult,
        User: userData,
        navigation: navigationPages,
        Reviews: artworkReviews,
        IsLoggedIn: isUserLoggedIn(res.locals.cookie.isLoggedin),
        AlreadyReviewed: alreadyReviewed,
        AlreadyLiked: isAlreadyLiked,
        LikeCount: likeCountResults,
        PageUrl: "/artwork",
      })
    );
  } catch (err) {
    console.error(err.message);
  }
});

// New Artwork API Route
app.post("/artwork", async (req, res) => {
  console.log(req.body);

  let countExistArtworkWithName = await artworks
    .countDocuments({ name: req.body.name })
    .exec();

  if (countExistArtworkWithName == 0) {
    let artworkDoc = new artworks(req.body);

    let newArtworkDoc = await artworkDoc.save();

    console.log(newArtworkDoc);

    res.sendStatus(200);
  } else {
    console.log("Artwork with same name already exists");
    res.status(400).send("Artwork with same name already exists");
  }
});

// Delete Artwork API Route
app.delete("/artwork", async (req, res) => {
  console.log("In Artwork delete function");
  console.log(req.body);
  const { artworkId } = req.body;

  try {
    artworks.deleteOne({ _id: artworkId }, function (err, doc) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        console.log("Removed Workshop: ", doc);
        res.sendStatus(200);
      }
    });
  } catch (err) {
    console.error(err.message);
  }
});

// Add Artwork Page Route
app.get("/add-artwork", async (req, res) => {
  if (!res.locals.cookie.isLoggedin) {
    res.send(403);
  } else {
    console.log("UserId: ", res.locals.cookie.id);

    let userData = await getUserById(res.locals.cookie.id);

    res.send(
      compiledAddArtworkPage({
        IsLoggedIn: isUserLoggedIn(res.locals.cookie.isLoggedin),
        Title: "Account Settings",
        User: userData,
        navigation: navigationPages,
        PageUrl: "/add-artwork",
      })
    );
  }
});

// Add Workshop Page Route
app.get("/add-workshop", async (req, res) => {
  if (!res.locals.cookie.isLoggedin) {
    res.send(403);
  } else {
    console.log("UserId: ", res.locals.cookie.id);

    let userData = await getUserById(res.locals.cookie.id);

    res.send(
      compiledAddWorkshopPage({
        IsLoggedIn: isUserLoggedIn(res.locals.cookie.isLoggedin),
        Title: "Add an Art Workshop",
        User: userData,
        navigation: navigationPages,
        PageUrl: "/add-workshop",
      })
    );
  }
});

// New Workshop API Route
app.post("/workshop", async (req, res) => {
  console.log("In Workshop POST function");
  console.log(req.body);

  let workshopDoc = new workshops(req.body);

  let newWorkshopDoc = await workshopDoc.save();

  console.log(newWorkshopDoc);

  res.sendStatus(200);
});

// Delete Workshop API Route
app.delete("/workshop", async (req, res) => {
  console.log("In Workshop delete function");
  console.log(req.body);

  const { userId, workshopId } = req.body;

  try {
    workshops.deleteOne(
      { user_id: userId, _id: workshopId },
      function (err, doc) {
        if (err) {
          console.log(err);
          res.sendStatus(500);
        } else {
          console.log("Removed Workshop: ", doc);
          res.sendStatus(200);
        }
      }
    );
  } catch (err) {
    console.error(err.message);
  }
});

// Artist Profile Page Route
app.get("/artist/:name", async (req, res) => {
  let artistName = req.params["name"];

  try {
    let artistResults = await getUserByName(artistName);

    let isAlreadyFollowing = await checkExistingFollow(
      res.locals.cookie.id,
      artistResults[0]._id.toString()
    );

    // execute query with page and limit values
    let artworkResults = await artworks
      .find({ artist: new RegExp(artistName, "i") })
      .exec();

    console.log(artworkResults);

    let workshopResults = await getAggregateWorkshopsForArtist(
      artistResults[0]._id.valueOf()
    );

    workshopResults.forEach((workshop) => {
      let isCurrentUserEnrolled = false;

      workshop.enrollments.forEach((enrollment) => {
        if (enrollment.user_id == res.locals.cookie.id) {
          console.log("Found enrollment for current user");
          isCurrentUserEnrolled = true;
        }
      });

      if (isCurrentUserEnrolled) {
        console.log("Adding UserEnrolled property to workshop");
        workshop["user_already_enrolled"] = true;
      }
      console.log(workshop);
    });

    let pageModel = {
      title: `Profile - ${artistName} `,
      Artist: artistResults[0],
      results: artworkResults,
      navigation: navigationPages,
      userid: res.locals.cookie.id,
      following: isAlreadyFollowing,
      IsLoggedIn: isUserLoggedIn(res.locals.cookie.isLoggedin),
      Workshops: workshopResults,
    };

    res.send(compiledProfilePage(pageModel));
  } catch (err) {
    console.error(err.message);
    if (err.message == "INVALID") {
      res.sendStatus(400);
    } else {
      res.sendStatus(500);
    }
  }
});

// Workshop Enrollment API Route
app.post("/enrollment", async (req, res) => {
  console.log("Adding Enrollment for Workshop");
  const { user_id, workshop_id } = req.body;
  console.log("Req Body:");
  console.log(req.body);

  try {
    console.log("Adding Enrollment");

    let newEnrollmentDoc = new enrollments();

    newEnrollmentDoc.user_id = user_id;
    newEnrollmentDoc.workshop_id = workshop_id;

    console.log(newEnrollmentDoc);

    await newEnrollmentDoc.save();

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
  }
});

// Follow Artist API Route
app.post("/follow", async (req, res) => {
  const { userId, artistId } = req.body;

  try {
    let isAlreadyFollowing = await checkExistingFollow(userId, artistId);

    console.log("Already Following? " + isAlreadyFollowing);

    // Check if already following artist
    if (!isAlreadyFollowing) {
      console.log("Adding Follow");
      let newFollowDoc = new follows();

      newFollowDoc.user_id = userId;
      newFollowDoc.artist_id = artistId;

      await newFollowDoc.save();
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
  }
});

// Unfollow Artist API
app.delete("/follow", async (req, res) => {
  const { userId, artistId } = req.body;

  try {
    // Find only one document matching the conditions and delete it
    follows.deleteOne(
      { user_id: userId, artist_id: artistId },
      function (err, doc) {
        if (err) {
          console.log(err);
          res.sendStatus(500);
        } else {
          console.log("Removed Follow : ", doc);
          res.sendStatus(200);
        }
      }
    );
  } catch (err) {
    console.error(err.message);
  }
});

// Like Artwork API Route
app.post("/like", async (req, res) => {
  console.log("Adding Like for Artwork");
  const { userId, artworkId } = req.body;
  console.log("Req Body:");
  console.log(req.body);
  try {
    let isAlreadyLiked = await checkExistingLikes(userId, artworkId);

    console.log("Already Liked? " + isAlreadyLiked);

    // Check if already following artist
    if (!isAlreadyLiked) {
      console.log("Adding Like");

      let newLikeDoc = new likes();

      newLikeDoc.user_id = userId;
      newLikeDoc.artwork_id = artworkId;

      console.log(newLikeDoc);

      await newLikeDoc.save();
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
  }
});

// Delete Artwork Like API Route
app.delete("/like", async (req, res) => {
  const { userId, artworkId } = req.body;

  try {
    // Find only one document matching the conditions and delete it
    likes.deleteOne(
      { user_id: userId, artwork_id: artworkId },
      function (err, doc) {
        if (err) {
          console.log(err);
          res.sendStatus(500);
        } else {
          console.log("Removed Like : ", doc);
          res.sendStatus(200);
        }
      }
    );
  } catch (err) {
    console.error(err.message);
  }
});

// Submit Artwork Review API Route
app.post("/review", async (req, res) => {
  //parse the request body
  console.log(req.body);
  let userId = req.body.user_id;
  let artworkId = req.body.artwork_id;
  let reviewText = req.body.text;

  try {
    console.log("Adding Artwork Review");
    let newReviewDoc = new reviews();

    newReviewDoc.user_id = userId;
    newReviewDoc.artwork_id = artworkId;
    newReviewDoc.text = reviewText;

    await newReviewDoc.save();
    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
  }
});

// Delete Artwork Review API Route
app.delete("/review", async (req, res) => {
  //parse the request body
  console.log(req.body);
  let reviewId = req.body.review_id;

  try {
    // Delete the document by its _id
    await reviews.deleteOne({ _id: reviewId });
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

//Checking if user in logged in
function isUserLoggedIn(cookie) {
  return cookie ? true : false;
}

//Finding the current users username
async function getUserByName(userName) {
  return await users.find({ name: new RegExp(userName, "i") }).exec();
}

//returns the user obj by a given user id
async function getUserById(userId) {
  return await users.findById(userId).exec();
}

//check if any followers exist to alter pug
async function checkExistingFollow(userid, artistid) {
  let followExists = false;

  //console.log(`Checking if ${userid} is following ${artistid}`);

  let followCountResults = await follows
    .countDocuments({ user_id: userid, artist_id: artistid })
    .exec();

  //console.log("Follow Count results: " + followCountResults);
  // if atleast one folloewr is returned set to true
  if (followCountResults > 0) {
    followExists = true;
  }

  // console.log("User already following artist? " + followExists);

  return followExists;
}

//check if any likes exist to alter pug
async function checkExistingLikes(userid, artworkid) {
  let likeExists = false;

  console.log(`Checking if user ${userid} has liked artwork ${artworkid}`);

  let likeCountResults = await likes
    .countDocuments({ user_id: userid, artwork_id: artworkid })
    .exec();

  console.log("Like Count: " + likeCountResults);
  if (likeCountResults > 0) {
    likeExists = true;
  }

  console.log("User already Liked Artwork? " + likeExists);

  return likeExists;
}

// find any reviews given to a select artwork
async function getReviewsbyArtwork(artworkId) {
  return await reviews.find({ artwork_id: artworkId }).exec();
}

// find any workshops created by a select user
async function getWorkshopsByUser(userId) {
  return await workshops.find({ user_id: userId }).exec();
}

//aggregating followers and relating artists
async function getAggregateFollows(userId) {
  console.log("Retrieving aggregated follows");
  const aggregateFollowsAndArtists = await follows.aggregate([
    {
      $match: {
        user_id: userId,
      },
    },
    { $addFields: { artist_id_obj: { $toObjectId: "$artist_id" } } },
    {
      $lookup: {
        from: "users",
        localField: "artist_id_obj",
        foreignField: "_id",
        as: "artist",
      },
    },
    {
      $project: {
        artist: { $arrayElemAt: ["$artist", 0] },
        user_id: true,
        artist_id: true,
      },
    },
  ]);

  return aggregateFollowsAndArtists;
}

// find any likes given to a select artwork
async function getArtworkLikesForUser(userId) {
  console.log("Retrieving Liked Artworks for User");
  const aggregateLikesAndArtworks = await likes.aggregate([
    {
      $match: {
        user_id: userId,
      },
    },
    { $addFields: { artwork_id_obj: { $toObjectId: "$artwork_id" } } },
    {
      $lookup: {
        from: "artworks",
        localField: "artwork_id_obj",
        foreignField: "_id",
        as: "artwork",
      },
    },
    {
      $project: {
        artwork: { $arrayElemAt: ["$artwork", 0] },
        user_id: true,
        artwork_id: true,
      },
    },
  ]);

  return aggregateLikesAndArtworks;
}

//aggregating reviews and relating users
async function getAggregateReviewsForUser(userId) {
  console.log("Retrieving Reviews merged with Artwork for User");
  const aggregateFollowsAndArtists = await reviews.aggregate([
    {
      $match: {
        user_id: userId,
      },
    },
    { $addFields: { artwork_id_obj: { $toObjectId: "$artwork_id" } } },
    {
      $lookup: {
        from: "artworks",
        localField: "artwork_id_obj",
        foreignField: "_id",
        as: "artwork",
      },
    },
    {
      $project: {
        artworkInfo: { $arrayElemAt: ["$artwork", 0] },
        text: true,
        user_id: true,
        artwork_id: true,
      },
    },
  ]);
  return aggregateFollowsAndArtists;
}

//aggregating workshops and relating artists/users
async function getAggregateWorkshopsForArtist(artistId) {
  console.log("Retrieving Merged Workshops and Enrollments for Artist");
  const aggregateWorkshopsAndEnrolledUsers = await workshops.aggregate([
    {
      $match: {
        user_id: artistId,
      },
    },
    { $addFields: { workshopId: { $toString: "$_id" } } },
    {
      $lookup: {
        from: "enrollments",
        localField: "workshopId",
        foreignField: "workshop_id",
        as: "enrollments",
      },
    },
  ]);
  return aggregateWorkshopsAndEnrolledUsers;
}
