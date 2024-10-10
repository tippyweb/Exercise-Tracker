require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

// adding modules
const bodyParser = require("body-parser");

// app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// adding MongoDB/mongoose
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// setting up Schema and DB model
const Schema = mongoose.Schema;

// User model
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});
const User = mongoose.model("User", userSchema);

// Exercise model
const exerciseSchema = new Schema({
  user_id: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: new Date()
  }
});
const Exercise = mongoose.model("Exercise", exerciseSchema);


app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Request to create a new user
app.post("/api/users", async (req, res) => {

  if (req.body) {
    const username = req.body.username;
    let userObject;

    try {
      User.findOne({username: username}, async (err, foundUser) => {
        // Error occrred
        if (err) {
          return console.log(err);
        }

        // The user already exists in the database
        if (await foundUser) {
          userObject = {
            username: foundUser.username,
            _id: foundUser._id
          };
          // Respond with the user data for already existing user
          return res.json(userObject);

        // The user doesn't exist in the database
        } else {
          // Save the new user in the database
          const newUser = new User( {username: username} );
          const savedUser = await newUser.save();
          const resUserData = {
            username: savedUser.username,
            _id: savedUser._id
          };

          // Respond with the new user data
          return res.json(resUserData);
        }
      });  // User.findOne({username: username}, async (err, foundUser)

    } catch(err) {
      return console.log(err);
    }
  }  // if (req.body) {
});


// Request to list all users
app.get("/api/users", async (req, res) => {
  
  // all users without log data
  const allUsers = await User.find({});
  res.json(allUsers);

});


// Request to list the specific user's exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  const _id = req.params._id;
  let limit;
  let exerciseData;

  // Construct the query object for exercises
  let query = {user_id: _id};

  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) {
      query.date['$gte'] = new Date(req.query.from);
    }
    if (req.query.to) {
      query.date['$lte'] = new Date(req.query.to);
    }
  }

  try {
    if (req.query.limit) {
      limit = Number(req.query.limit);

      // Find exercise data
      exerciseData = await Exercise.find(query).limit(limit);
    } else {
      exerciseData = await Exercise.find(query);
    }

    // Find user data
    const userData = await User.findOne({_id: _id});

    const dateFormattedLog = exerciseData.map((obj) => {
      return {
        description: obj.description,
        duration: obj.duration,
        date: obj.date.toDateString()
      }
    });

    const resUserData = {
      username: userData.username,
      count: dateFormattedLog.length,
      _id: userData._id,
      log: dateFormattedLog
    }
    res.json(resUserData);

  } catch (err) {
    console.log(err);
  }

});


// Request to create a new exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  if (req.body) {
    const _id = req.body[':_id'] || req.params._id;

    try {
      User.findOne({_id: _id}, async (err, foundUser) => {
        // Error occrred
        if (err) {
          return console.log(err);
        }

        // The user exists in the database
        if (await foundUser) {
          const username = foundUser.username;
          const description = req.body.description;
          const duration = Number(req.body.duration);

          let exerciseObject = {
            user_id: _id,
            description: description,
            duration: duration,       
          };

          // If date exists, make it a Date object
          if (req.body.date) {
            exerciseObject.date = new Date(req.body.date);
          }

          // Save the new exercise in the database
          const newExercise = new Exercise(exerciseObject);
          const savedExercise = await newExercise.save();

          // Respond with the new exercise data
          exerciseObject = {
            username: username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: savedExercise.date.toDateString(),
            _id: _id
          };
          return res.json(exerciseObject);

        // The user doesn't exist in the database
        } else {
          return res.json({error: "The user does not exist in the database!"});
        }

      });  // User.findOne({_id: user_id}, async (err, foundUser) => {

    } catch (err) {
      return console.log(err);
    }

  }  // if (req.body) {

});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

