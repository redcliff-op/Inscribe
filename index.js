const express = require('express')
const cors = require('cors')
const path = require('path')
const noteModel = require("./models/note")
const userModel = require("./models/user")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')

const app = express()
app.use(cors())
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.set('view engine', 'ejs')

app.get("/", async (req, res) => {
  try {
    if (!req.cookies?.token) {
      return res.render("signin")
    }
    const tokenInfo = jwt.verify(req.cookies.token, "secret")
    const user = await userModel.findOne({ email: tokenInfo.email })
    if (!user) {
      return res.status(401).send("Unauthorized: Invalid user")
    }
    const notes = await noteModel.find({ user: user._id })
    res.render("home", { notes: notes })

  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).render("signin", { message: "Invalid or expired token" })
    }
    console.error(err)
    res.status(500).send("Internal server error")
  }
})

app.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await userModel.findOne({ email: email })
    if (!user) {
      return res.status(404).render("signup", { message: "User not found, please sign up" })
    }
    bcrypt.compare(password, user.password, async (err, result) => {
      if (err) {
        console.error(err)
        return res.status(500).send("Error during password comparison")
      }
      if (result) {
        const token = jwt.sign({ email: email }, "secret")
        res.cookie("token", token)
        res.redirect("/")
      } else {
        res.status(401).render("signin", { message: "Incorrect password" })
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).send("Internal server error")
  }
})

app.post("/signup", (req, res) => {
  try {
    const { username, email, password, age } = req.body
    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        console.error(err)
        return res.status(500).send("Error generating salt")
      }
      bcrypt.hash(password, salt, async (err, hash) => {
        if (err) {
          console.error(err)
          return res.status(500).send("Error hashing password")
        }
        await userModel.create({
          username,
          email,
          password: hash,
          age
        })
        const token = jwt.sign({ email }, "secret")
        res.cookie("token", token)
        res.redirect("/")
      })
    })
  } catch (err) {
    console.error(err)
    res.status(500).send("Internal server error")
  }
})

app.post("/signout", (req, res) => {
  try {
    res.cookie("token", "", { expires: new Date(0) })
    res.redirect("/")
  } catch (err) {
    console.error(err)
    res.status(500).send("Failed to sign out")
  }
})

app.post("/create", async (req, res) => {
  try {
    if (await noteModel.exists({ title: req.body.title })) {
      await noteModel.updateOne(
        { title: req.body.title },
        { title: req.body.title, content: req.body.content }
      )
    } else {
      const tokenInfo = jwt.verify(req.cookies.token, "secret")
      const user = await userModel.findOne({ email: tokenInfo.email })
      if (!user) {
        return res.status(401).send("Unauthorized: User not found")
      }
      const note = await noteModel.create({
        title: req.body.title,
        content: req.body.content,
        user: user._id
      })
      user.posts.push(note._id)
      await user.save()
    }
    res.redirect("/")
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).render("signin", { message: "Invalid token" })
    }
    console.error(err)
    res.status(500).send("Failed to create or update note")
  }
})

app.get("/delete/:_id", async (req, res) => {
  try {
    await noteModel.findOneAndDelete({ _id: req.params._id })
    res.redirect("/")
  } catch (err) {
    console.error(err)
    res.status(500).send("Failed to delete note")
  }
})

app.get("/notes/:_id", async (req, res) => {
  try {
    const note = await noteModel.findOne({ _id: req.params._id })
    if (!note) {
      return res.status(404).send("Note not found")
    }
    res.render("viewnote", { title: note.title, content: note.content })
  } catch (err) {
    console.error(err)
    res.status(500).send("Failed to retrieve note")
  }
})

app.listen(4000)
