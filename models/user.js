const mongoose = require('mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/server')

const userSchema = mongoose.Schema({
  username: String,
  email: String,
  password: String,
  age: Number,
  posts : [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "notes"
    }
  ]
})

module.exports = mongoose.model("users", userSchema)