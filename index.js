const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const session = require("express-session"); //middleware
const knexSessionStore = require("connect-session-knex")(session); //bring it connect-session-knex and then call session inton it to connect it
const server = express();
const db = require("./data/dataHelpers.js");
const bcrypt = require("bcryptjs");

const sessionOptions = {
  name: "carbon ",
  secret: "Diamond is my hardest form",
  cookie: {
    maxAge: 1000 * 60 * 60, // seesion is valid for 1 hour in milliseconds....1000=1sec
    secure: false //for production we have to make it true , in development it is false
  },
  httpOnly: true, //can't be accessed through javascript,document.cookie
  resave: false,
  saveUninitialized: false, //laws against setting cookies automatically
  //if no store then it will store in memory(RAM), knex session store is a class,we will pass an objrect to it with ahving all the configuration

  store: new knexSessionStore({
    //we will be every session in the database now
    knex: require("./data/dbConfig.js"),
    tablename: "sessions",
    sidfieldname: "sid", //session field name
    createTable: true, //if no table is there it will create a table otherwise will leave as it is
    clearInterval: 1000 * 60 * 60 //it will clear thye endup session every hour
  })
};

server.use(session(sessionOptions)); //this middleware creates a new session if not already there and
//and then it will put that on request.body(req.body)
server.use(helmet());
server.use(express.json());
server.use(cors());

//configure express-seesion middleware

server.get("/api/register", (req, res) => {
  console.log("GET....");
  res.send("It's alive!");
});

server.post("/api/register", (req, res) => {
  let user = req.body;

  //generate hash password from user's password
  const hash = bcrypt.hashSync(user.password, 16); //2to the power 16
  //override user's password with hash
  user.password = hash;
  db.addUser(user)
    .then(saved => {
      res.status(201).json(saved);
    })
    .catch(error => {
      res.status(500).json(error);
    });
});

server.post("/api/login", (req, res) => {
  console.log("HERE IS THE SESSION", req.session);
  let { username, password } = req.body;
  db.findBy({ username })
    .first()
    .then(user => {
      // if user exists and password is the password put in for login and user.password is the hashed
      //  password which was converted into hashed at the time of register.bcrypt is written in
      //  such a way that it can compare thre original woth the hashed one.
      if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = user;
        console.log("Request Session", req.session);
        res.status(200).json({
          message: `Welcome ${
            user.username
          }!,you are logged in successfully,have a cookie`
        });
      } else {
        res.status(401).json({ message: "You can't pass" });
      }
    })
    .catch(error => {
      res.status(500).json(error);
    });
});
//now we want to go in a restrictred route  which can only be acccessed if we have a session and a
//session user,so commenting out everything below because we have already verified in login that we
// have a valid user having username and password.in login, the only way we can have req.session.user
// is if that user has been validated.we don't have to check every single time.so, now we have to check whether
//a session exist or not, we can find on request.what would be true ..if the user is logged inwe have asession and username on the session
//if we are in the same domain localhost 5000, we have access to the cookie
// function restricted (req,res,next){
//   console.log("Req : ", req)
//    const {username,password}=req.headers;
//    if(username && password){
//       db.findBy({username})
//         .first()
//         .then(user =>{
//             if(user && bcrypt.compareSync(password,user.password)){
//              next()
//             }else{
//               res.status(401).json({message:"you can't pass"})

//             }
//         })
//         .catch(error =>{
//           res.status(500).json(error);
//         })

//    }else{
//     res.status(400).json({message:"No credentials provided"})

//    }
// }

function restricted(req, res, next) {
  console.log(req.session);
  if (req.session && req.session.user) {
    next();
  } else {
    res
      .status(401)
      .json({ message: "you shall not pass or show him the login page" });
  }
}

//protect this route only authenticated  users can see it.
server.get("/api/users", restricted, (req, res) => {
  console.log("Get users");
  db.find()
    .then(users => {
      res.json(users);
    })
    .catch(err => res.send(err));
});

server.get("/api/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      //req.session.destroy takes a callback
      if (err) {
        res.status(400).json({ message: "you can't leave the session" });
      } else {
        res.send("bye,bye");
      }
    });
  } else {
    res.send();
  }
});

const port = 9090;
server.listen(port, () => console.log(`\n** Running on port ${port} **\n`));
