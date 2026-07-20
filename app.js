const express = require("express");
const path = require("path");

const app = express();

app.set("view engine", "ejs");

app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.use(express.static(path.join(__dirname,"public")));

app.use("/",require("./routes/books"));

app.listen(3000,()=>{
    console.log("http://localhost:3000");
});