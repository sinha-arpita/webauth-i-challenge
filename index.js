const express = require("express");
const server = express();
server.use(express.json());
const db = require("./data/dataHelpers.js");
const bcrypt = require("bcryptjs");

server.get("/api/register", (req, res) => {
  console.log("GET....");
  res.send("It's alive!");
});

server.post("/api/register", (req, res) => {
  let user = req.body;
  console.log("User", req);
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
  let { username, password } = req.body;
  db.findBy({ username })
    .first()
    .then(user => {
     // if user exists and password is the password put in for login and user.password is the hashed 
  //  password which was converted into hashed at the time of register.bcrypt is written in
  //  such a way that it can compare thre original woth the hashed one.
      if (user && bcrypt.compareSync(password,user.password)) {
        res.status(200).json({ message: `Welcome ${user.username}!,you are logged in successfully` });
      } else {
        res.status(401).json({ message: "You can't pass" });
      }
    })
    .catch(error => {
      res.status(500).json(error);
    });
});

function restricted (req,res,next){
  console.log("Req : ", req)
   const {username,password}=req.headers;
   if(username && password){
      db.findBy({username})
        .first()
        .then(user =>{
            if(user && bcrypt.compareSync(password,user.password)){
             next()
            }else{
              res.status(401).json({message:"you can't pass"})

            }
        })
        .catch(error =>{
          res.status(500).json(error);
        })

   }else{
    res.status(400).json({message:"No credentials provided"})

   }
}



//protect this route only authenticated  users can see it. 
server.get("/api/users",restricted,(req, res)=> {
  console.log("Get users")
  db.find()
    .then(users => {
      res.json(users);
    })
    .catch(err => res.send(err));
});

const port = 9090;
server.listen(port, () => console.log(`\n** Running on port ${port} **\n`));
